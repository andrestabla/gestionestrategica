"use client";

// F04 · Cascada y plan trimestral (capacidad de Ejecución, marco 4Shine Empresas).
// Baja las prioridades de la empresa a metas trimestrales de cada área: cascada por prioridad, metas del
// trimestre con criterio de éxito, plan de acción (hitos con responsable, recursos y fecha),
// interdependencias entre áreas y ciclo trimestral (planear, ejecutar, cerrar y aprender).

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, Card, CardHeader, Modal, EmptyNote, Field, AutoTextarea, SkeletonCards } from "@/components/ui";
import { useCan, useUser } from "@/components/user-context";
import { useCatalog } from "@/components/catalog-context";
import { leversOf, horizonsOf } from "@/data/catalogo";
import { vocabOf, yearOfFirstHorizon } from "@/lib/vocabulario";
import { confirmar, avisar, confirmarGuardar, confirmarEliminar } from "@/components/feedback";
import { AyudaMetodologica } from "@/components/ayuda-metodologica";
import { DescargarDecisiones } from "@/components/descargar-decisiones";
import { trimestresDe, trimestreLabel, cicloTrimestre, interdependencias, arbolCascada, METAS_ESTADOS, HITO_ESTADOS, type MetaTrimestral, type Hito, type Dependencia, type MetaEstado, type Articulacion, type AreaArticulada, type NodoIniciativa } from "@/lib/cascada";
import { ArbolCascada } from "@/components/arbol-cascada";
import { ArticulacionModal } from "@/components/articulacion-modal";
import type { Decision } from "@/lib/priorizacion";
import { Plus, Pencil, Trash2, Loader2, Save, Sparkles, CalendarRange, GitBranch, ListChecks, Network, RefreshCw, CheckCircle2, Flag, Users2 } from "lucide-react";

const INPUT = "input !py-2 text-[12px]";
const ESTADO_CLS: Record<MetaEstado, string> = { PLANEADA: "chip", EN_CURSO: "chip chip-cyan", CUMPLIDA: "chip chip-ok", PARCIAL: "chip chip-gold", NO_CUMPLIDA: "chip chip-bad" };
const corto = (t: string, n = 150) => (t.length > n ? `${t.slice(0, n).trimEnd()}…` : t);
const estadoLabel = (e: MetaEstado) => METAS_ESTADOS.find((x) => x.id === e)?.label ?? e;
type Draft = Omit<MetaTrimestral, "id" | "by" | "at" | "cierre"> & { id?: string };

export default function CascadaPage() {
  const { catalog: cat } = useCatalog();
  const user = useUser();
  const V = vocabOf(cat.company);
  const canAll = useCan("manage_catalog");
  const levers = leversOf(cat.company);
  const areas = cat.responsibles;
  // año de arranque: el del trimestre de inicio más frecuente entre las iniciativas (el año que se baja a metas); si no hay, el del primer horizonte
  const yearBase = useMemo(() => {
    const cnt = new Map<number, number>();
    for (const i of cat.initiatives) { const y = Number(i.start?.slice(0, 4)); if (y >= 2020) cnt.set(y, (cnt.get(y) ?? 0) + 1); }
    return [...cnt.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? yearOfFirstHorizon(horizonsOf(cat.company));
  }, [cat]);
  const [metas, setMetas] = useState<MetaTrimestral[] | null>(null);
  const [articulaciones, setArticulaciones] = useState<Record<string, Articulacion>>({});
  const [decisions, setDecisions] = useState<Record<string, { decision?: Decision | null }>>({});
  const [vista, setVista] = useState<"arbol" | "trimestre">("arbol");
  const [filtroArea, setFiltroArea] = useState(user.role === "RESPONSABLE" && user.responsibleId ? user.responsibleId : "");
  const [artIni, setArtIni] = useState<NodoIniciativa | null>(null);
  const [articulando, setArticulando] = useState<{ n: number; total: number } | null>(null);
  const [year, setYear] = useState<number>(yearBase);
  const [quarter, setQuarter] = useState<string>(`${yearBase}-T1`);
  const [lever, setLever] = useState("");
  const [edit, setEdit] = useState<Draft | null>(null);
  const [cierre, setCierre] = useState<MetaTrimestral | null>(null);
  const [busy, setBusy] = useState(false);

  const aplicar = useCallback((j: { metas?: MetaTrimestral[]; articulaciones?: Record<string, Articulacion>; decisions?: Record<string, { decision?: Decision | null }> } | null) => { setMetas(j?.metas ?? []); if (j?.articulaciones) setArticulaciones(j.articulaciones); if (j?.decisions) setDecisions(j.decisions); }, []);
  const load = useCallback(() => fetch("/api/td/cascada").then((r) => (r.ok ? r.json() : null)).then(aplicar).catch(() => setMetas([])), [aplicar]);
  useEffect(() => { let alive = true; fetch("/api/td/cascada").then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive) aplicar(j); }).catch(() => { if (alive) setMetas([]); }); return () => { alive = false; }; }, [aplicar]);

  const post = async (body: Record<string, unknown>, okMsg: string, confirmado = false) => {
    // cada guardado se confirma: varias áreas trabajan la cascada a la vez (las acciones con su propio diálogo ya vienen confirmadas)
    if (!confirmado && body.op !== "delete" && !(await confirmarGuardar(body.op === "articulacion" ? "la articulación entre áreas" : body.op === "cerrar" ? "el cierre del trimestre" : "la meta trimestral"))) return false;
    setBusy(true);
    try {
      const res = await fetch("/api/td/cascada", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { avisar(j.error ?? "No se pudo guardar.", "bad"); return false; }
      setMetas(j.metas ?? []); if (j.articulaciones) setArticulaciones(j.articulaciones); avisar(okMsg); return true;
    } finally { setBusy(false); }
  };
  const puede = (areaId: string) => canAll || (user.role === "RESPONSABLE" && user.responsibleId === areaId);
  const areaName = (id: string) => areas.find((a) => a.id === id)?.dependencia || areas.find((a) => a.id === id)?.cargo || id;
  const leverName = (id: string) => levers.find((l) => l.id === id)?.name ?? id;

  const trimestres = trimestresDe(year);
  const delAnio = useMemo(() => (metas ?? []).filter((m) => m.quarter.startsWith(`${year}-`) && (!lever || m.lever === lever)), [metas, year, lever]);
  const delTrim = delAnio.filter((m) => m.quarter === quarter);
  const ciclo = cicloTrimestre(delAnio, quarter);
  const deps = interdependencias(delAnio, quarter);
  const years = useMemo(() => [...new Set([yearBase, yearBase + 1, ...(metas ?? []).map((m) => Number(m.quarter.slice(0, 4)))])].sort(), [metas, yearBase]);

  const nueva = (pre?: Partial<Draft>) => setEdit({ quarter, areaId: user.role === "RESPONSABLE" && user.responsibleId ? user.responsibleId : (areas[0]?.id ?? ""), lever: lever || levers[0]?.id || "", meta: "", criterio: "", hitos: [], depende: [], estado: "PLANEADA", ...pre });
  const borrar = async (m: MetaTrimestral) => { if (await confirmarEliminar(`la meta «${m.meta.slice(0, 60)}» de ${areaName(m.areaId)}`)) await post({ op: "delete", id: m.id }, "Meta eliminada.", true); };
  const arbol = arbolCascada({ levers, objectives: cat.objectives, kpis: cat.kpis, initiatives: cat.initiatives, metas: metas ?? [], articulaciones, decisions, year, soloPortafolio: true });
  const puedeArticular = (ini: NodoIniciativa) => canAll || (user.role === "RESPONSABLE" && user.responsibleId === ini.ownerId);
  const guardarArticulacion = async (iniId: string, areas: AreaArticulada[]) => { if (await post({ op: "articulacion", iniId, data: { areas } }, "Articulación guardada.")) setArtIni(null); };
  // una sola acción del advisor: el modelo articula todas las iniciativas del portafolio que aún no lo están
  const articularTodas = async () => {
    const ids = arbol.flatMap((p) => p.objetivos.flatMap((o) => o.krs.flatMap((k) => k.iniciativas.filter((i) => !i.articulada).map((i) => i.id))));
    if (!ids.length) { avisar("Todas las iniciativas del portafolio ya están articuladas; edita cada una desde el árbol.", "warn"); return; }
    if (!(await confirmar(`El modelo propondrá la articulación entre áreas de ${ids.length} iniciativa${ids.length === 1 ? "" : "s"} del portafolio (quién lidera, quién contribuye y qué hace cada una). Después puedes editar cada una. ¿Continuar?`))) return;
    setArticulando({ n: 0, total: ids.length }); let hechas = 0; const errores: string[] = [];
    try {
      for (const iniId of ids) {
        setArticulando({ n: hechas, total: ids.length });
        const res = await fetch("/api/td/cascada/articular", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ iniId }) });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { errores.push(`${iniId}: ${j.error ?? "sin respuesta"}`); if (res.status === 403 || res.status === 503) break; continue; }
        setArticulaciones((a) => ({ ...a, [iniId]: j.articulacion })); hechas++;
      }
    } finally { setArticulando(null); }
    if (errores.length) avisar(`${hechas} de ${ids.length} articuladas. Falló: ${errores.slice(0, 2).join(" · ")}`, hechas ? "warn" : "bad"); else avisar(`Articulación propuesta para ${hechas} iniciativa${hechas === 1 ? "" : "s"}.`);
  };
  const proponer = async () => {
    if (!(await confirmar({ title: `Proponer la cascada ${year} desde el portafolio`, body: "Se crea una meta por cada iniciativa articulada del año y por cada área que participa, en su trimestre de inicio, con la contribución del área como meta. Las iniciativas sin articulación se omiten; las metas que ya existen no se duplican; después se ajusta cada una.", confirmLabel: "Proponer" }))) return;
    await post({ op: "proponer", year }, "Cascada propuesta desde el portafolio.", true);
  };

  return (
    <>
      <PageHeader kicker="F04 · Ejecución" title="Cascada y plan trimestral" desc={`Bajar las ${V.leversLow} de la empresa a metas trimestrales de cada área: qué aporta cada una, con qué criterio de éxito, con qué hitos, qué necesita de las demás y cómo cierra el trimestre.`}
        actions={<>
          <AyudaMetodologica tema="cascada" />
          <DescargarDecisiones modulo="cascada" />
          {canAll && user.role !== "DIRECTIVO" && <button onClick={() => void articularTodas()} disabled={busy || articulando !== null} className="btn-ghost btn-sm text-[12px] disabled:opacity-50" title="El modelo propone, para cada iniciativa del portafolio sin articular, qué áreas participan y qué hace cada una">{articulando ? <><Loader2 size={13} className="animate-spin" /> Articulando {articulando.n + 1} de {articulando.total}…</> : <><Users2 size={13} /> Articular áreas con IA</>}</button>}
          {canAll && <button onClick={proponer} disabled={busy} className="btn-ghost btn-sm text-[12px]"><Sparkles size={13} /> Proponer metas desde el portafolio</button>}
          {(canAll || user.role === "RESPONSABLE") && <button onClick={() => nueva()} disabled={busy} className="btn-primary btn-sm text-[12px]"><Plus size={13} /> Nueva meta</button>}
        </>} />

      <div className="mb-3 inline-flex rounded-xl bg-surface-2 p-1 text-[12px] font-bold">
        {([["arbol", "Árbol de la cascada"], ["trimestre", "Por trimestre"]] as const).map(([v, l]) => <button key={v} type="button" onClick={() => setVista(v)} className={`rounded-lg px-3 py-1.5 transition-all ${vista === v ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>{l}</button>)}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={year} onChange={(e) => { const y = Number(e.target.value); setYear(y); setQuarter(`${y}-T${quarter.slice(-1)}`); }} className="input w-auto !py-1.5 pr-7 !text-[12px]">{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        {vista === "trimestre" && <div className="flex gap-1">{trimestres.map((q) => <button key={q} onClick={() => setQuarter(q)} className={`chip ${q === quarter ? "chip-cyan" : ""}`}>{trimestreLabel(q)}</button>)}</div>}
        {vista === "arbol" && <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)} className="input w-full !py-1.5 pr-7 !text-[12px] sm:w-auto" aria-label="Filtrar por área"><option value="">Todas las áreas</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.dependencia || a.cargo}</option>)}</select>}
        <select value={lever} onChange={(e) => setLever(e.target.value)} className="input w-full !py-1.5 pr-7 !text-[12px] sm:w-auto sm:max-w-[320px]"><option value="">{V.leversAll}</option>{levers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <button onClick={load} title="Actualizar" className="btn-ghost btn-sm ml-auto text-[12px]"><RefreshCw size={12} /></button>
      </div>

      {metas === null ? <SkeletonCards n={3} /> : vista === "arbol" ? (
        <Card className="rise mb-5">
          <CardHeader title={`Cascada ${year} · ${V.lever} → objetivo → resultado clave → iniciativa → área → persona o equipo → meta por trimestre`} sub="Cada iniciativa es trabajo articulado entre áreas: quién lidera, quién contribuye, en qué orden y qué debe hacer cada una; las metas del trimestre cuelgan de cada área" />
          <div className="px-5 pb-5">
            <ArbolCascada arbol={arbol} trimestres={trimestres} areaName={areaName} filtroArea={filtroArea} puedeArea={puede} puedeArticular={puedeArticular}
              onNuevaMeta={(pre) => { const i = cat.initiatives.find((x) => x.id === pre.initiative); const o = cat.objectives.find((x) => x.id === i?.cmi); nueva({ ...pre, lever: o?.lever ?? lever ?? levers[0]?.id ?? "", objective: i?.cmi, kpi: i?.kpi || undefined }); }}
              onEditarMeta={(m) => setEdit({ ...m })} onArticular={(ini) => setArtIni(ini)} />
          </div>
        </Card>
      ) : (
        <>
          {/* Ciclo trimestral */}
          <Card className="rise mb-5">
            <CardHeader title={`Ciclo ${trimestreLabel(quarter)}`} sub="Planear · ejecutar · cerrar · aprender" />
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-4">
              {[
                { t: "Planear", icon: CalendarRange, v: `${ciclo.metas} meta${ciclo.metas === 1 ? "" : "s"} · ${ciclo.areas} área${ciclo.areas === 1 ? "" : "s"}`, s: ciclo.sinCriterio ? `${ciclo.sinCriterio} sin criterio de éxito` : "todas con criterio de éxito", ok: ciclo.metas > 0 && ciclo.sinCriterio === 0 },
                { t: "Ejecutar", icon: ListChecks, v: `${ciclo.hitosHechos} de ${ciclo.hitos} hitos`, s: ciclo.dependencias ? `${ciclo.dependencias} dependencia${ciclo.dependencias === 1 ? "" : "s"} entre áreas` : "sin dependencias declaradas", ok: ciclo.hitos > 0 && ciclo.hitosHechos === ciclo.hitos },
                { t: "Cerrar", icon: Flag, v: `${ciclo.cerradas} de ${ciclo.metas} cerradas`, s: ciclo.cumplimiento == null ? "sin cierre todavía" : `cumplimiento promedio ${ciclo.cumplimiento} %`, ok: ciclo.metas > 0 && ciclo.cerradas === ciclo.metas },
                { t: "Aprender", icon: Sparkles, v: `${ciclo.aprendizajes.length} aprendizaje${ciclo.aprendizajes.length === 1 ? "" : "s"}`, s: ciclo.aprendizajes[0] ? `«${ciclo.aprendizajes[0].slice(0, 70)}${ciclo.aprendizajes[0].length > 70 ? "…" : ""}»` : "se registran al cerrar cada meta", ok: ciclo.aprendizajes.length > 0 },
              ].map((b) => (
                <div key={b.t} className={`rounded-xl border px-3.5 py-3 ${b.ok ? "border-line bg-surface-2/60" : "border-dashed border-line-strong"}`}>
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-faint"><b.icon size={13} className={b.ok ? "text-ok" : "text-cyan-deep"} /> {b.t}</div>
                  <div className="num mt-1 text-[14px] font-extrabold text-ink">{b.v}</div>
                  <div className="text-[12px] text-muted">{b.s}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Cascada por prioridad */}
          <Card className="rise mb-5">
            <CardHeader title={`Cascada por ${V.leverLow}`} sub={`${V.lever} → objetivo → área → meta del trimestre`} />
            <div className="px-5 pb-5">
              {levers.filter((l) => !lever || l.id === lever).map((l) => {
                const ms = delTrim.filter((m) => m.lever === l.id);
                const objs = [...new Set(ms.map((m) => m.objective ?? ""))];
                return (
                  <div key={l.id} className="mb-4 last:mb-0">
                    <div className="flex items-center gap-2 text-[13px] font-bold text-ink"><GitBranch size={14} className="text-cyan-deep" /> {l.name}<span className="num text-[11.5px] font-semibold text-faint">· {ms.length} meta{ms.length === 1 ? "" : "s"}</span></div>
                    {ms.length === 0 ? <div className="ml-6 mt-1 text-[12px] italic text-faint">Sin metas este trimestre. {canAll && <button onClick={() => nueva({ lever: l.id })} className="font-semibold text-cyan-deep hover:underline">Añadir una</button>}</div> : objs.map((o) => {
                      const ob = cat.objectives.find((x) => x.id === o);
                      return (
                        <div key={o || "none"} className="ml-6 mt-2 border-l-2 border-line pl-3">
                          <div className="text-[12.5px] font-semibold text-ink-soft">{ob ? `${ob.id} · ${ob.name}` : "Sin objetivo directivo"}</div>
                          <ul className="mt-1 space-y-1">
                            {ms.filter((m) => (m.objective ?? "") === o).map((m) => (
                              <li key={m.id} className="flex flex-wrap items-center gap-2 text-[12.5px]"><span className="chip">{areaName(m.areaId)}</span><span className="text-ink" title={m.meta}>{corto(m.meta)}</span><span className={ESTADO_CLS[m.estado]}>{estadoLabel(m.estado)}</span></li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {levers.length === 0 && <EmptyNote>Primero se definen las {V.leversLow} de la empresa.</EmptyNote>}
            </div>
          </Card>

          {/* Metas del trimestre: matriz áreas × trimestres */}
          <Card className="rise mb-5 overflow-hidden">
            <CardHeader title={`Metas del trimestre · ${year}`} sub="Cada área con su meta por trimestre; se abre la ficha para el plan de acción, las dependencias y el cierre" />
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-4 py-2">Área</th>{trimestres.map((q) => <th key={q} className={`px-2 py-2 ${q === quarter ? "text-cyan-deep" : ""}`}>{trimestreLabel(q)}</th>)}</tr></thead>
                <tbody>
                  {areas.map((a) => (
                    <tr key={a.id} className="border-t border-line align-top">
                      <td className="px-4 py-2"><div className="font-semibold text-ink">{a.dependencia || a.cargo}</div><div className="text-[11.5px] text-faint">{a.cargo}</div></td>
                      {trimestres.map((q) => {
                        const ms = delAnio.filter((m) => m.areaId === a.id && m.quarter === q);
                        return (
                          <td key={q} className={`px-2 py-2 ${q === quarter ? "bg-cyan-wash/30" : ""}`}>
                            <ul className="space-y-1.5">
                              {ms.map((m) => (
                                <li key={m.id} className="rounded-lg border border-line bg-surface px-2.5 py-2">
                                  <div className="flex items-start gap-1.5">
                                    <span className="flex-1 text-[12px] leading-snug text-ink" title={m.meta}>{corto(m.meta)}</span>
                                    {puede(m.areaId) && <span className="flex shrink-0 gap-0.5"><button onClick={() => setEdit({ ...m })} title="Editar" className="rounded p-1 text-faint hover:bg-surface-2 hover:text-ink"><Pencil size={12} /></button><button onClick={() => borrar(m)} title="Eliminar" className="rounded p-1 text-faint hover:bg-surface-2 hover:text-bad"><Trash2 size={12} /></button></span>}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-faint">
                                    <span className={ESTADO_CLS[m.estado]}>{estadoLabel(m.estado)}</span>
                                    <span>{leverName(m.lever)}</span>
                                    {m.hitos.length > 0 && <span className="num">· {m.hitos.filter((h) => h.estado === "HECHO").length}/{m.hitos.length} hitos</span>}
                                    {m.depende.length > 0 && <span className="num">· {m.depende.length} dep.</span>}
                                    {m.cierre && <span className="num font-semibold text-ink-soft">· {m.cierre.cumplimiento} %</span>}
                                    {puede(m.areaId) && !m.cierre && <button onClick={() => setCierre(m)} className="font-semibold text-cyan-deep hover:underline">cerrar</button>}
                                  </div>
                                  {!m.criterio && <div className="mt-1 text-[11px] italic text-warn">sin criterio de éxito</div>}
                                </li>
                              ))}
                              {puede(a.id) && <li><button onClick={() => nueva({ areaId: a.id, quarter: q })} className="text-[11.5px] font-semibold text-faint hover:text-cyan-deep"><Plus size={11} className="inline" /> meta</button></li>}
                            </ul>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {areas.length === 0 && <tr><td colSpan={5} className="px-4 py-3 italic text-faint">Sin áreas (responsables) en el catálogo.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Plan de acción e interdependencias del trimestre */}
          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="rise overflow-hidden">
              <CardHeader title={`Plan de acción · ${trimestreLabel(quarter)}`} sub="Hitos con responsable, recursos y fecha" />
              {delTrim.flatMap((m) => m.hitos.map((h, i) => ({ m, h, i }))).length === 0 ? <div className="px-5 pb-5"><EmptyNote>Sin hitos todavía: se descompone cada meta en hitos desde su ficha.</EmptyNote></div> : (
                <div className="overflow-x-auto"><table className="w-full text-[12.5px]">
                  <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-4 py-2">Hito</th><th className="px-2 py-2">Área · meta</th><th className="px-2 py-2">Responsable</th><th className="px-2 py-2">Fecha</th><th className="px-2 py-2">Estado</th></tr></thead>
                  <tbody>{delTrim.flatMap((m) => m.hitos.map((h, i) => (
                    <tr key={`${m.id}-${i}`} className="border-t border-line align-top">
                      <td className="px-4 py-2 text-ink">{h.name}{h.recursos && <div className="text-[11.5px] text-faint">{h.recursos}</div>}</td>
                      <td className="px-2 py-2 text-[12px] text-muted">{areaName(m.areaId)}<div className="text-[11.5px] text-faint">{m.meta.slice(0, 60)}{m.meta.length > 60 ? "…" : ""}</div></td>
                      <td className="px-2 py-2 text-[12px]">{h.responsable ?? "—"}</td>
                      <td className="num px-2 py-2 text-[12px]">{h.fecha ?? "—"}</td>
                      <td className="px-2 py-2"><span className={`chip ${h.estado === "HECHO" ? "chip-ok" : h.estado === "EN_CURSO" ? "chip-cyan" : ""}`}>{HITO_ESTADOS.find((e) => e.id === h.estado)?.label}</span></td>
                    </tr>
                  )))}</tbody>
                </table></div>
              )}
            </Card>
            <Card className="rise overflow-hidden">
              <CardHeader title={`Interdependencias · ${trimestreLabel(quarter)}`} sub="Qué necesita cada área de las demás para cumplir su meta" />
              {deps.length === 0 ? <div className="px-5 pb-5"><EmptyNote>Sin dependencias declaradas. Cada meta puede indicar qué necesita de otras áreas; así se ve dónde una área frena a otra.</EmptyNote></div> : (
                <ul className="divide-y divide-line">
                  {deps.map((d, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2 px-5 py-2.5 text-[12.5px]">
                      <Network size={13} className="shrink-0 text-cyan-deep" />
                      <span className="chip">{areaName(d.de)}</span><span className="text-faint">necesita de</span><span className="chip chip-cyan">{areaName(d.a)}</span>
                      <span className="w-full text-ink sm:w-auto sm:flex-1">{d.que}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      {artIni && <ArticulacionModal ini={{ id: artIni.id, name: artIni.name, ownerId: artIni.ownerId }} areas={areas} people={cat.people} initial={articulaciones[artIni.id]?.areas} busy={busy} onClose={() => setArtIni(null)} onSave={(a) => guardarArticulacion(artIni.id, a)} />}
      {edit && <MetaModal draft={edit} areas={areas} levers={levers} cat={cat} canAll={canAll} busy={busy} onClose={() => setEdit(null)}
        onSave={async (d) => { if (await post({ op: "upsert", data: d }, d.id ? "Meta actualizada." : "Meta creada.")) setEdit(null); }} />}
      {cierre && <CierreModal meta={cierre} busy={busy} onClose={() => setCierre(null)} onSave={async (c, a) => { if (await post({ op: "cerrar", id: cierre.id, cumplimiento: c, aprendizaje: a }, "Trimestre cerrado para la meta.")) setCierre(null); }} />}
    </>
  );
}

function MetaModal({ draft, areas, levers, cat, canAll, busy, onClose, onSave }: { draft: Draft; areas: { id: string; dependencia: string; cargo: string }[]; levers: { id: string; name: string }[]; cat: ReturnType<typeof useCatalog>["catalog"]; canAll: boolean; busy: boolean; onClose: () => void; onSave: (d: Draft) => Promise<void> }) {
  const [d, setD] = useState<Draft>(draft);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const objs = cat.objectives.filter((o) => o.lever === d.lever);
  const kpis = cat.kpis.filter((k) => !d.objective || k.cmi === d.objective);
  const inis = cat.initiatives.filter((i) => !d.objective || i.cmi === d.objective);
  const setHito = (i: number, p: Partial<Hito>) => set("hitos", d.hitos.map((h, j) => (j === i ? { ...h, ...p } : h)));
  const setDep = (i: number, p: Partial<Dependencia>) => set("depende", d.depende.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <Modal title={d.id ? "Meta del trimestre" : "Nueva meta del trimestre"} sub="Una meta por área y trimestre, con criterio de éxito, hitos y lo que necesita de otras áreas" onClose={onClose} wide
      footer={<><button onClick={onClose} className="btn-ghost btn-sm text-[12px]">Cancelar</button><button onClick={() => onSave(d)} disabled={busy || d.meta.trim().length < 5} className="btn-primary btn-sm text-[12px]">{busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar</button></>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Trimestre"><input value={d.quarter} onChange={(e) => set("quarter", e.target.value)} placeholder="2027-T1" className={INPUT} /></Field>
        <Field label="Área"><select value={d.areaId} onChange={(e) => set("areaId", e.target.value)} disabled={!canAll} className={INPUT}>{areas.map((a) => <option key={a.id} value={a.id}>{a.dependencia || a.cargo}</option>)}</select></Field>
        <Field label="Estado"><select value={d.estado} onChange={(e) => set("estado", e.target.value as MetaEstado)} className={INPUT}>{METAS_ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}</select></Field>
        <Field label="Prioridad estratégica"><select value={d.lever} onChange={(e) => setD((x) => ({ ...x, lever: e.target.value, objective: undefined, kpi: undefined, initiative: undefined }))} className={INPUT}>{levers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
        <Field label="Objetivo directivo"><select value={d.objective ?? ""} onChange={(e) => setD((x) => ({ ...x, objective: e.target.value || undefined, kpi: undefined, initiative: undefined }))} className={INPUT}><option value="">—</option>{objs.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.name}</option>)}</select></Field>
        <Field label="Resultado clave"><select value={d.kpi ?? ""} onChange={(e) => set("kpi", e.target.value || undefined)} className={INPUT}><option value="">—</option>{kpis.map((k) => <option key={k.code} value={k.code}>{k.code} · {k.name}</option>)}</select></Field>
        <Field label="Persona o equipo" help="Quién responde dentro del área." className="sm:col-span-3"><input value={d.persona ?? ""} onChange={(e) => set("persona", e.target.value || undefined)} placeholder="p. ej. Jefe de planeación · equipo de visita virtual" className={INPUT} /></Field>
        <Field label="Iniciativa del portafolio" className="sm:col-span-3"><select value={d.initiative ?? ""} onChange={(e) => set("initiative", e.target.value || undefined)} className={INPUT}><option value="">—</option>{inis.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
        <Field label="Meta del trimestre" help="Qué logra el área este trimestre, en una frase." className="sm:col-span-3"><AutoTextarea value={d.meta} onChange={(e) => set("meta", e.target.value)} className={INPUT} /></Field>
        <Field label="Criterio de éxito" help="Cómo sabremos que se cumplió: cifra, entregable o condición verificable." className="sm:col-span-3"><AutoTextarea value={d.criterio} onChange={(e) => set("criterio", e.target.value)} className={INPUT} /></Field>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between"><span className="label !text-[11px]">Plan de acción · hitos</span><button onClick={() => set("hitos", [...d.hitos, { name: "", estado: "PENDIENTE" }])} className="text-[12px] font-semibold text-cyan-deep hover:underline"><Plus size={11} className="inline" /> hito</button></div>
        {d.hitos.length === 0 && <p className="text-[12px] italic text-faint">Descompón la meta en hitos con responsable, recursos y fecha.</p>}
        <div className="space-y-2">{d.hitos.map((h, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-line p-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]">
            <input value={h.name} onChange={(e) => setHito(i, { name: e.target.value })} placeholder="Hito" className={INPUT} />
            <input value={h.responsable ?? ""} onChange={(e) => setHito(i, { responsable: e.target.value })} placeholder="Responsable" className={INPUT} />
            <input value={h.recursos ?? ""} onChange={(e) => setHito(i, { recursos: e.target.value })} placeholder="Recursos" className={INPUT} />
            <input type="date" value={h.fecha ?? ""} onChange={(e) => setHito(i, { fecha: e.target.value })} className={INPUT} />
            <select value={h.estado} onChange={(e) => setHito(i, { estado: e.target.value as Hito["estado"] })} className={INPUT}>{HITO_ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}</select>
            <button onClick={() => set("hitos", d.hitos.filter((_, j) => j !== i))} title="Quitar" className="rounded p-1.5 text-faint hover:text-bad"><Trash2 size={13} /></button>
          </div>
        ))}</div>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between"><span className="label !text-[11px]">Depende de otras áreas</span><button onClick={() => set("depende", [...d.depende, { areaId: areas.find((a) => a.id !== d.areaId)?.id ?? "", que: "" }])} className="text-[12px] font-semibold text-cyan-deep hover:underline"><Plus size={11} className="inline" /> dependencia</button></div>
        {d.depende.length === 0 && <p className="text-[12px] italic text-faint">Qué necesita esta área de otra para cumplir la meta (interdependencias del trimestre).</p>}
        <div className="space-y-2">{d.depende.map((x, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1fr_2fr_auto]">
            <select value={x.areaId} onChange={(e) => setDep(i, { areaId: e.target.value })} className={INPUT}>{areas.filter((a) => a.id !== d.areaId).map((a) => <option key={a.id} value={a.id}>{a.dependencia || a.cargo}</option>)}</select>
            <input value={x.que} onChange={(e) => setDep(i, { que: e.target.value })} placeholder="Qué necesita y para cuándo" className={INPUT} />
            <button onClick={() => set("depende", d.depende.filter((_, j) => j !== i))} title="Quitar" className="rounded p-1.5 text-faint hover:text-bad"><Trash2 size={13} /></button>
          </div>
        ))}</div>
      </div>
    </Modal>
  );
}

function CierreModal({ meta, busy, onClose, onSave }: { meta: MetaTrimestral; busy: boolean; onClose: () => void; onSave: (cumplimiento: number, aprendizaje: string) => Promise<void> }) {
  const [c, setC] = useState(100); const [a, setA] = useState("");
  return (
    <Modal title="Cierre del trimestre" sub={meta.meta} onClose={onClose}
      footer={<><button onClick={onClose} className="btn-ghost btn-sm text-[12px]">Cancelar</button><button onClick={() => onSave(c, a)} disabled={busy} className="btn-primary btn-sm text-[12px]">{busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Cerrar meta</button></>}>
      {meta.criterio && <p className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-[12.5px] text-ink-soft"><span className="font-semibold">Criterio de éxito:</span> {meta.criterio}</p>}
      <Field label={`Cumplimiento · ${c} %`} help="Frente al criterio de éxito. 90 % o más cuenta como cumplida; entre 1 y 89, parcial; 0, no cumplida."><input type="range" min={0} max={100} step={5} value={c} onChange={(e) => setC(Number(e.target.value))} className="w-full" /></Field>
      <Field label="Aprendizaje" help="Qué aprendió el área este trimestre y qué cambia para el siguiente." className="mt-3"><AutoTextarea value={a} onChange={(e) => setA(e.target.value)} className={INPUT} /></Field>
    </Modal>
  );
}

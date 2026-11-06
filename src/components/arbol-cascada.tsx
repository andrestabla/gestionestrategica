"use client";

// Árbol de la cascada trimestral: Prioridad → objetivo → resultado clave → iniciativa → área (rol, prioridad,
// persona o equipo) → metas por trimestre. Deja a la vista que cada iniciativa es trabajo articulado entre áreas:
// qué hace cada una y en qué orden. Plegable por prioridad; filtrable por área.

import { useState } from "react";
import { EmptyNote } from "@/components/ui";
import { ROL_AREA, trimestreLabel, type NodoPrioridad, type NodoIniciativa, type MetaTrimestral, type MetaEstado } from "@/lib/cascada";
import { decisionLabel, type Decision } from "@/lib/priorizacion";
import { DECISION_CLS } from "@/components/priorizacion";
import { GitBranch, ChevronDown, ChevronRight, Plus, Pencil, Network, Users2 } from "lucide-react";

const ESTADO_CLS: Record<MetaEstado, string> = { PLANEADA: "chip", EN_CURSO: "chip chip-cyan", CUMPLIDA: "chip chip-ok", PARCIAL: "chip chip-gold", NO_CUMPLIDA: "chip chip-bad" };
const corto = (t: string, n = 90) => (t.length > n ? `${t.slice(0, n).trimEnd()}…` : t);

export function ArbolCascada({ arbol, trimestres, areaName, filtroArea, puedeArea, puedeArticular, onNuevaMeta, onEditarMeta, onArticular }: {
  arbol: NodoPrioridad[]; trimestres: string[]; areaName: (id: string) => string; filtroArea: string;
  puedeArea: (areaId: string) => boolean; puedeArticular: (ini: NodoIniciativa) => boolean;
  onNuevaMeta: (pre: { areaId: string; quarter: string; initiative: string; persona?: string }) => void;
  onEditarMeta: (m: MetaTrimestral) => void; onArticular: (ini: NodoIniciativa) => void;
}) {
  const [plegadas, setPlegadas] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setPlegadas((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const visible = (ini: NodoIniciativa) => !filtroArea || ini.areas.some((a) => a.areaId === filtroArea) || ini.sueltas.some((m) => m.areaId === filtroArea);
  const ramas = arbol.map((p) => ({ ...p, objetivos: p.objetivos.map((o) => ({ ...o, krs: o.krs.map((k) => ({ ...k, iniciativas: k.iniciativas.filter(visible) })).filter((k) => k.iniciativas.length) })).filter((o) => o.krs.length) })).filter((p) => p.objetivos.length);
  if (!ramas.length) return <EmptyNote>No hay iniciativas del portafolio en este año{filtroArea ? " para el área elegida" : ""}. Entran las que tienen decisión «implementar» o «preparar», las articuladas y las que ya tienen metas.</EmptyNote>;

  return (
    <div className="space-y-4">
      {ramas.map((p) => {
        const cerrada = plegadas.has(p.id);
        return (
          <div key={p.id} className="rounded-2xl border border-line">
            <button type="button" onClick={() => toggle(p.id)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
              {cerrada ? <ChevronRight size={15} className="text-faint" /> : <ChevronDown size={15} className="text-faint" />}
              <GitBranch size={15} className="text-cyan-deep" />
              <span className="text-[13.5px] font-extrabold text-ink">{p.order}. {p.name}</span>
              <span className="num ml-auto text-[11.5px] text-faint">{p.objetivos.length} objetivo{p.objetivos.length === 1 ? "" : "s"} · {p.objetivos.reduce((a, o) => a + o.krs.reduce((b, k) => b + k.iniciativas.length, 0), 0)} iniciativas</span>
            </button>
            {!cerrada && <div className="space-y-3 px-4 pb-4">
              {p.objetivos.map((o) => (
                <div key={o.id} className="ml-2 border-l-2 border-line pl-3">
                  <div className="text-[12.5px] font-bold text-ink"><span className="num text-cyan-deep">{o.id}</span> · {o.name}</div>
                  {o.krs.map((k) => (
                    <div key={k.code || "sin-kr"} className="ml-2 mt-2 border-l-2 border-dashed border-line pl-3">
                      <div className="text-[12px] font-semibold text-ink-soft">{k.code ? <><span className="num">{k.code}</span> · </> : null}{k.name}</div>
                      {k.iniciativas.map((ini) => (
                        <div key={ini.id} className="mt-2 rounded-xl bg-surface-2/60 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="num text-[11px] font-bold text-faint">{ini.id}</span>
                            <span className="text-[12.5px] font-bold text-ink">{ini.name}</span>
                            {ini.decision && <span className={`${DECISION_CLS[ini.decision as Decision]} !py-0 text-[10.5px]`}>{decisionLabel(ini.decision as Decision)}</span>}
                            <span className="text-[11.5px] text-faint">dueña: {areaName(ini.ownerId) || "—"}</span>
                            {puedeArticular(ini) && <button type="button" onClick={() => onArticular(ini)} className="btn-ghost btn-sm ml-auto inline-flex items-center gap-1 text-[11.5px]"><Users2 size={12} /> {ini.articulada ? "Editar articulación" : "Articular áreas"}</button>}
                          </div>
                          {!ini.articulada && ini.areas.length === 0 && <p className="mt-1.5 text-[12px] italic text-faint">Sin articulación: declara qué áreas participan y qué hace cada una; después se registran las metas por trimestre.</p>}
                          {ini.areas.length > 0 && (
                            <div className="mt-2 overflow-x-auto">
                              <table className="w-full text-[12px]">
                                <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-faint"><th className="px-2 py-1">Área · rol · prioridad</th><th className="px-2 py-1">Persona o equipo</th><th className="px-2 py-1">Qué debe hacer</th>{trimestres.map((q) => <th key={q} className="num px-2 py-1">{trimestreLabel(q)}</th>)}</tr></thead>
                                <tbody>
                                  {ini.areas.map((a) => (
                                    <tr key={a.areaId} className={`border-t border-line align-top ${filtroArea && a.areaId === filtroArea ? "bg-cyan-wash/40" : ""}`}>
                                      <td className="px-2 py-1.5"><div className="font-semibold text-ink">{areaName(a.areaId)}</div><div className="text-[11px] text-faint"><span className={`chip !py-0 text-[10.5px] ${a.rol === "LIDERA" ? "chip-cyan" : ""}`}>{ROL_AREA[a.rol]}</span> · prioridad {a.prioridad}</div></td>
                                      <td className="px-2 py-1.5 text-ink-soft">{a.persona || "—"}</td>
                                      <td className="px-2 py-1.5 text-ink-soft" title={a.contribucion}>{corto(a.contribucion, 140)}{a.entrega && <div className="text-[11px] text-faint">Entrega: {a.entrega}</div>}</td>
                                      {trimestres.map((q) => (
                                        <td key={q} className="min-w-[150px] px-2 py-1.5">
                                          <ul className="space-y-1">
                                            {(a.metas[q] ?? []).map((m) => (
                                              <li key={m.id} className="rounded-lg border border-line bg-surface px-2 py-1.5">
                                                <div className="flex items-start gap-1"><span className="flex-1 text-[11.5px] leading-snug text-ink" title={m.meta}>{corto(m.meta)}</span>{puedeArea(m.areaId) && <button type="button" onClick={() => onEditarMeta(m)} className="rounded p-0.5 text-faint hover:text-ink" title="Editar"><Pencil size={11} /></button>}</div>
                                                <div className="mt-0.5 flex flex-wrap gap-1 text-[10.5px] text-faint"><span className={`${ESTADO_CLS[m.estado]} !py-0 text-[10px]`}>{m.estado.toLowerCase().replace("_", " ")}</span>{m.hitos.length > 0 && <span className="num">{m.hitos.filter((h) => h.estado === "HECHO").length}/{m.hitos.length} hitos</span>}{m.cierre && <span className="num font-semibold">{m.cierre.cumplimiento} %</span>}</div>
                                              </li>
                                            ))}
                                            {puedeArea(a.areaId) && <li><button type="button" onClick={() => onNuevaMeta({ areaId: a.areaId, quarter: q, initiative: ini.id, persona: a.persona })} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-faint hover:text-cyan-deep"><Plus size={10} /> meta</button></li>}
                                          </ul>
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {ini.sueltas.length > 0 && <div className="mt-2 text-[11.5px] text-warn"><Network size={11} className="mr-1 inline" />{ini.sueltas.length} meta{ini.sueltas.length === 1 ? "" : "s"} de áreas no declaradas en la articulación: {[...new Set(ini.sueltas.map((m) => areaName(m.areaId)))].join(", ")}. Agrégalas a la articulación o reasigna la meta.</div>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>}
          </div>
        );
      })}
    </div>
  );
}

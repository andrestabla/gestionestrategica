"use client";

// Capacidades para ejecutar (marco 4Shine Empresas). Con el portafolio decidido, cada iniciativa en «implementar» o
// «preparar» se recorre con un checklist de cinco frentes (unidad, proceso, procedimiento, conocimiento, tecnología)
// para reconocer si la capacidad está instalada o qué haría falta. El advisor o el administrador personaliza el
// checklist con IA para cada iniciativa; la revisión la registran el advisor, el sponsor o el responsable.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, CardHeader, Modal, EmptyNote, StatCard, SkeletonCards } from "@/components/ui";
import { useCan, useUser, useBase } from "@/components/user-context";
import { useCatalog } from "@/components/catalog-context";
import { leversOf } from "@/data/catalogo";
import { vocabOf, estrategiaHref } from "@/lib/vocabulario";
import { DIMS } from "@/data/mapa";
import { avisar, confirmar } from "@/components/feedback";
import { AyudaMetodologica } from "@/components/ayuda-metodologica";
import { DescargarDecisiones } from "@/components/descargar-decisiones";
import { RevisionCapacidadesFocal, SEMAFORO_CLS, type RevisionBorrador } from "@/components/revision-capacidades";
import { FRENTES, NIVEL_CAP, SEMAFORO, lecturaCapacidades, checklistHash, type ChecklistCap, type RevisionCapacidades, type Semaforo, type PropuestaCapacidades } from "@/lib/capacidades";
import { decisionLabel, type Decision } from "@/lib/priorizacion";
import { DECISION_CLS } from "@/components/priorizacion";
import { ShieldCheck, Sparkles, Loader2, ClipboardCheck, RefreshCw, Eye } from "lucide-react";

type Datos = { elegibles: { id: string; decision: Decision }[]; checklists: Record<string, ChecklistCap>; revisiones: Record<string, RevisionCapacidades> };
type Estado = Semaforo | "sin-revisar" | "desactualizada";
const ESTADO_LABEL: Record<Estado, string> = { lista: SEMAFORO.lista.label, ajustes: SEMAFORO.ajustes.label, brechas: SEMAFORO.brechas.label, "sin-revisar": "Sin revisar", desactualizada: "Revisar de nuevo (checklist cambió)" };
const ESTADO_CLS: Record<Estado, string> = { ...SEMAFORO_CLS, "sin-revisar": "chip", desactualizada: "chip chip-gold" };

export default function CapacidadesPage() {
  const { catalog: cat } = useCatalog();
  const user = useUser();
  const base = useBase();
  const V = vocabOf(cat.company);
  const canAll = useCan("manage_catalog");
  const puedePersonalizar = canAll && (user.role === "ADMIN" || user.role === "CONSULTOR");   // la IA la dispara el advisor; los directivos revisan
  const levers = leversOf(cat.company);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [fOwner, setFOwner] = useState(user.role === "RESPONSABLE" && user.responsibleId ? user.responsibleId : "");
  const [fEstado, setFEstado] = useState<"" | Estado>("");
  const [revisando, setRevisando] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personalizando, setPersonalizando] = useState<{ n: number; total: number } | null>(null);

  const load = useCallback(() => fetch("/api/td/capacidades").then((r) => (r.ok ? r.json() : null)).then((j) => setDatos(j ?? { elegibles: [], checklists: {}, revisiones: {} })).catch(() => setDatos({ elegibles: [], checklists: {}, revisiones: {} })), []);
  useEffect(() => { void load(); }, [load]);

  const owner = (id: string) => cat.responsibles.find((r) => r.id === id)?.dependencia ?? "";
  const leverOf = (iniId: string) => { const i = cat.initiatives.find((x) => x.id === iniId); const o = cat.objectives.find((x) => x.id === i?.cmi); return levers.find((l) => l.id === o?.lever); };
  const puedeRevisar = (iniId: string) => {
    if (canAll) return true;
    if (user.role !== "RESPONSABLE" || !user.responsibleId) return false;
    const i = cat.initiatives.find((x) => x.id === iniId);
    return i?.ownerId === user.responsibleId || leverOf(iniId)?.ownerId === user.responsibleId;
  };
  const frentesDe = (iniId: string) => datos?.checklists[iniId]?.frentes ?? FRENTES;
  const estadoDe = (iniId: string): Estado => {
    const r = datos?.revisiones[iniId]; if (!r) return "sin-revisar";
    if (r.checklist && r.checklist !== checklistHash(frentesDe(iniId))) return "desactualizada";
    return lecturaCapacidades(r, frentesDe(iniId)).semaforo ?? "sin-revisar";
  };

  const filas = useMemo(() => (datos?.elegibles ?? []).map((e) => {
    const i = cat.initiatives.find((x) => x.id === e.id);
    const lever = leverOf(e.id);
    return i ? { ...e, i, lever, estado: estadoDe(e.id), rev: datos?.revisiones[e.id], chk: datos?.checklists[e.id] } : null;
  }).filter((x): x is NonNullable<typeof x> => !!x).filter((f) => (!fOwner || f.i.ownerId === fOwner) && (!fEstado || f.estado === fEstado))
    .sort((a, b) => (a.decision === b.decision ? 0 : a.decision === "IMPLEMENTAR" ? -1 : 1) || a.i.name.localeCompare(b.i.name, "es")),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [datos, cat, fOwner, fEstado]);
  const todas = useMemo(() => datos?.elegibles ?? [], [datos]);
  const duenos = useMemo(() => cat.responsibles.filter((r) => todas.some((e) => cat.initiatives.find((i) => i.id === e.id)?.ownerId === r.id)), [cat, todas]);
  const cuenta = (e: Estado) => todas.filter((x) => estadoDe(x.id) === e).length;

  const guardar = async (iniId: string, r: RevisionBorrador) => {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/td/capacidades", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ iniId, revision: r }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? "No se pudo registrar."); return false; }
      setDatos((d) => (d ? { ...d, revisiones: j.revisiones ?? d.revisiones } : d)); avisar("Revisión registrada."); setRevisando(null); return true;
    } finally { setSaving(false); }
  };
  const proponer = async (iniId: string): Promise<PropuestaCapacidades | null> => {
    const res = await fetch("/api/td/capacidades/proponer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ iniId }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { avisar(j.error ?? "El modelo no respondió.", "bad"); return null; }
    return j.propuesta ?? null;
  };
  // una sola acción del advisor o el admin: el modelo adapta el checklist de todas las iniciativas elegibles, una por una
  const personalizarTodas = async () => {
    const ids = todas.map((e) => e.id);
    if (!ids.length) { avisar("No hay iniciativas con decisión implementar o preparar.", "bad"); return; }
    const pendientes = ids.filter((id) => !datos?.checklists[id]);
    const objetivo = pendientes.length ? pendientes : ids;
    if (!pendientes.length && !(await confirmar(`Las ${ids.length} iniciativas ya tienen checklist personalizado. ¿Generarlos de nuevo? Las revisiones registradas quedarán marcadas para revisarse otra vez.`))) return;
    setPersonalizando({ n: 0, total: objetivo.length });
    let hechas = 0; const errores: string[] = [];
    try {
      for (const iniId of objetivo) {
        setPersonalizando({ n: hechas, total: objetivo.length });
        const res = await fetch("/api/td/capacidades/personalizar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ iniId }) });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { errores.push(`${iniId}: ${j.error ?? "sin respuesta"}`); if (res.status === 403 || res.status === 503) break; continue; }
        setDatos((d) => (d ? { ...d, checklists: { ...d.checklists, [iniId]: j.checklist } } : d)); hechas++;
      }
    } finally { setPersonalizando(null); }
    if (errores.length) avisar(`${hechas} de ${objetivo.length} personalizadas. Falló: ${errores.slice(0, 3).join(" · ")}`, hechas ? "warn" : "bad");
    else avisar(`Checklist personalizado para ${hechas} iniciativa${hechas === 1 ? "" : "s"}.`);
  };

  const rev = revisando ? cat.initiatives.find((i) => i.id === revisando) : null;
  const det = detalle ? filas.find((f) => f.id === detalle) ?? null : null;
  const fichaDe = (iniId: string) => {
    const i = cat.initiatives.find((x) => x.id === iniId); if (!i) return null;
    const kr = cat.kpis.find((k) => k.code === i.kpi); const lever = leverOf(iniId); const dim = DIMS.find((d) => d.code === i.capability);
    return (
      <ul className="space-y-1">
        {kr && <li><b className="text-ink">Resultado clave que mueve:</b> {kr.code} {kr.name}{kr.baseline != null && kr.target != null ? ` · de ${kr.baseline} a ${kr.target}${kr.unit ? ` ${kr.unit}` : ""}` : ""}{kr.due ? ` · ${kr.due}` : ""}</li>}
        {lever && <li><b className="text-ink">{V.lever}:</b> {lever.name}{lever.ownerId ? ` · sponsor ${owner(lever.ownerId)}` : ""}</li>}
        <li><b className="text-ink">Responsable:</b> {owner(i.ownerId) || "sin responsable"} · {i.start || "—"} a {i.end || "—"} · presupuesto planeado {i.budgetPlanned ? i.budgetPlanned.toLocaleString("es-CO") : "—"}</li>
        {dim && <li><b className="text-ink">Capacidad que declara instalar:</b> {dim.code} {dim.name}</li>}
        {i.observaciones && <li><b className="text-ink">Observaciones:</b> {i.observaciones}</li>}
      </ul>
    );
  };

  return (
    <>
      <PageHeader kicker={V.kicker} title="Capacidades para ejecutar"
        desc="Con el portafolio decidido, cada iniciativa en «implementar» o «preparar» se recorre con un checklist de cinco frentes: unidad, proceso, procedimiento, conocimiento y tecnología. El resultado dice si la capacidad está instalada o qué haría falta antes de arrancar."
        actions={<div className="flex flex-wrap items-center gap-2">
          {puedePersonalizar && <button type="button" onClick={() => void personalizarTodas()} disabled={personalizando !== null || todas.length === 0} className="btn-primary btn-sm inline-flex items-center gap-1.5 text-[12px] disabled:opacity-50" title="El modelo adapta las afirmaciones, preguntas y niveles de cada iniciativa elegible a su contexto y al de la empresa">{personalizando ? <><Loader2 size={12} className="animate-spin" /> Personalizando {personalizando.n + 1} de {personalizando.total}…</> : <><Sparkles size={12} /> Personalizar checklists con IA</>}</button>}
          <AyudaMetodologica tema="capacidades" />
          <DescargarDecisiones modulo="capacidades" />
        </div>} />

      {datos === null ? <SkeletonCards n={4} /> : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Iniciativas por revisar" value={todas.length} foot="con decisión implementar o preparar" accent="var(--grad-brand)" />
            <StatCard label="Listas para ejecutar" value={cuenta("lista")} foot="cinco frentes instalados" accent="linear-gradient(90deg, var(--ok), #2f8f5b)" />
            <StatCard label="Con ajustes" value={cuenta("ajustes")} foot="capacidades parciales que se cierran al arrancar" accent="linear-gradient(90deg, var(--warn), var(--gold))" />
            <StatCard label="Con brechas críticas" value={cuenta("brechas")} foot="algún frente no existe: se resuelve antes" accent="linear-gradient(90deg, var(--bad), #b23a3a)" />
          </div>

          {todas.length === 0 ? (
            <Card className="rise p-6"><EmptyNote>Aún no hay iniciativas con decisión «implementar» o «preparar». Las decisiones de tiempo se registran en <Link href={estrategiaHref(cat.company, "portafolio", base)} className="font-bold text-cyan-deep hover:underline">{V.tabs.portafolio}</Link>; desde allí entran aquí.</EmptyNote></Card>
          ) : (
            <Card className="rise overflow-hidden">
              <CardHeader title="Iniciativas del portafolio" sub={`${filas.length} de ${todas.length} · ${canAll ? "cada dueño filtra sus iniciativas y revisa sus capacidades; el advisor revisa cualquiera" : "filtra tus iniciativas y revisa las capacidades para ejecutarlas"}`}
                right={<div className="flex flex-wrap gap-2">
                  <select value={fOwner} onChange={(e) => setFOwner(e.target.value)} className="input !py-1.5 pr-7 !text-[12px]" aria-label="Filtrar por dueño de la iniciativa"><option value="">Todos los dueños</option>{duenos.map((r) => <option key={r.id} value={r.id}>{r.dependencia || r.cargo}</option>)}</select>
                  <select value={fEstado} onChange={(e) => setFEstado(e.target.value as Estado | "")} className="input !py-1.5 pr-7 !text-[12px]" aria-label="Filtrar por estado"><option value="">Todos los estados</option>{(Object.keys(ESTADO_LABEL) as Estado[]).map((e) => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}</select>
                </div>} />
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-5 py-2">Iniciativa</th><th className="px-3 py-2">Dueño</th><th className="px-3 py-2">Decisión</th><th className="px-3 py-2">Checklist</th><th className="px-3 py-2">Capacidad para ejecutar</th><th className="px-3 py-2 text-right">Acciones</th></tr></thead>
                  <tbody>
                    {filas.map((f) => {
                      const lect = f.rev ? lecturaCapacidades(f.rev, frentesDe(f.id)) : null;
                      return (
                        <tr key={f.id} className="border-t border-line align-top">
                          <td className="px-5 py-2.5"><div className="font-semibold text-ink">{f.i.name}</div><div className="text-[11.5px] text-muted">{f.id}{f.i.kpi ? ` · KR ${f.i.kpi}` : ""}{f.lever ? ` · ${f.lever.name}` : ""}</div></td>
                          <td className="px-3 py-2.5 text-ink-soft">{owner(f.i.ownerId) || "sin dueño"}</td>
                          <td className="px-3 py-2.5"><span className={`${DECISION_CLS[f.decision]} !py-0 text-[11px]`}>{decisionLabel(f.decision)}</span></td>
                          <td className="px-3 py-2.5">
                            <span className="chip !py-0 text-[11px]" title={f.chk ? `${f.chk.resumen || "Personalizado"} · ${f.chk.by} · ${f.chk.at.slice(0, 10)}` : "Checklist genérico de cinco frentes"}>{f.chk ? <><Sparkles size={10} /> personalizado</> : "genérico"}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`${ESTADO_CLS[f.estado]} !py-0 text-[11px]`}>{ESTADO_LABEL[f.estado]}</span>
                            {lect && lect.brechas.length > 0 && <div className="mt-0.5 text-[11.5px] text-muted">Brechas: {lect.brechas.map((b) => `${b.name.toLowerCase()} (${b.nivel})`).join(", ")}</div>}
                            {f.rev && <div className="text-[11px] text-faint">{f.rev.by} · {f.rev.at.slice(0, 10)}{f.rev.notas ? " · con notas" : ""}</div>}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {f.rev && <button type="button" onClick={() => setDetalle(f.id)} className="btn-ghost btn-sm inline-flex items-center gap-1 text-[12px]"><Eye size={12} /> Ver</button>}
                              {puedeRevisar(f.id) && <button type="button" onClick={() => { setError(null); setRevisando(f.id); }} className="btn-primary btn-sm inline-flex items-center gap-1 text-[12px]">{f.rev ? <RefreshCw size={12} /> : <ClipboardCheck size={12} />} {f.rev ? "Revisar de nuevo" : "Revisar"}</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filas.length === 0 && <tr><td colSpan={6} className="px-5 py-4 text-[12.5px] text-faint">Ninguna iniciativa coincide con el filtro.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {rev && (
        <RevisionCapacidadesFocal key={`${rev.id}-${datos?.revisiones[rev.id]?.at ?? "nueva"}`} ini={{ id: rev.id, name: rev.name, objetivo: rev.objetivo, detalle: fichaDe(rev.id) }}
          frentes={frentesDe(rev.id)} personalizado={datos?.checklists[rev.id] ? { by: datos.checklists[rev.id].by, at: datos.checklists[rev.id].at, resumen: datos.checklists[rev.id].resumen } : null}
          initial={datos?.revisiones[rev.id] && estadoDe(rev.id) !== "desactualizada" ? datos.revisiones[rev.id] : null}
          saving={saving} error={error} onSave={(r) => guardar(rev.id, r)} onExit={() => setRevisando(null)} proponer={() => proponer(rev.id)} />
      )}

      {det && det.rev && (() => {
        const lect = lecturaCapacidades(det.rev, frentesDe(det.id));
        return (
          <Modal title={`Capacidades · ${det.i.name}`} sub={`${det.id} · revisada por ${det.rev.by} el ${det.rev.at.slice(0, 10)}${det.estado === "desactualizada" ? " · el checklist cambió después: conviene revisarla de nuevo" : ""}`} onClose={() => setDetalle(null)} wide>
            <div className="mb-3 flex flex-wrap items-center gap-2">{lect.semaforo && <span className={`${SEMAFORO_CLS[lect.semaforo]} !text-[12.5px]`}><ShieldCheck size={12} /> {SEMAFORO[lect.semaforo].label}</span>}<span className="text-[12px] text-muted">{lect.semaforo ? SEMAFORO[lect.semaforo].desc : ""}</span></div>
            <div className="space-y-2">
              {frentesDe(det.id).map((f) => {
                const lf = lect.frentes.find((x) => x.key === f.key)!;
                return (
                  <div key={f.key} className="rounded-xl bg-surface-2 px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2"><div className="text-[13px] font-bold text-ink">{f.name}</div><b className={`num text-[12.5px] ${lf.nivel === 3 ? "text-ok" : lf.nivel === 2 ? "text-warn" : "text-bad"}`}>{lf.nivel ? `${lf.nivel} · ${NIVEL_CAP[lf.nivel]}` : "—"}</b></div>
                    <ul className="mt-1.5 space-y-1">
                      {f.items.map((it) => { const n = det.rev!.respuestas[it.code]; return <li key={it.code} className="flex items-start gap-2 text-[12px] text-ink-soft"><span className={`num shrink-0 font-bold ${n === 3 ? "text-ok" : n === 2 ? "text-warn" : n === 1 ? "text-bad" : "text-faint"}`}>{it.code} · {n ?? "—"}</span><span>{it.texto}{n ? <span className="text-faint"> — {it.niveles[n]}</span> : null}</span></li>; })}
                    </ul>
                    {lf.falta && <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-[12px] leading-snug text-ink"><b>Qué haría falta:</b> {lf.falta}</p>}
                  </div>
                );
              })}
            </div>
            {det.rev.notas && <div className="mt-3 rounded-xl bg-cyan-wash px-3.5 py-3 text-[12.5px] leading-relaxed text-ink"><div className="text-[11px] font-bold uppercase tracking-wider text-cyan-deep">Notas de quien revisa</div><p className="mt-1 whitespace-pre-line">{det.rev.notas}</p></div>}
            {lect.brechas.length > 0 && <p className="mt-3 text-[12px] leading-relaxed text-muted">Las brechas críticas (nivel 1) se resuelven antes de arrancar: como hito previo en la <Link href={`${base}/panel/cascada`} className="font-bold text-cyan-deep hover:underline">cascada trimestral</Link> o como iniciativa habilitante. Los ajustes (nivel 2) se programan en paralelo con responsable y fecha.</p>}
          </Modal>
        );
      })()}
    </>
  );
}

"use client";

// Gestión de proyectos · registro de riesgos y problemas. Matriz de probabilidad por impacto con los
// riesgos vivos, la lista completa y el formulario. Lo edita quien puede editar las tareas del
// proyecto; cada cambio queda en la auditoría y entra como movimiento al tablero de impacto.

import { useState } from "react";
import { Card, CardHeader, EmptyNote, Field, Modal, Skeleton } from "@/components/ui";
import { avisar, confirmarEliminar } from "@/components/feedback";
import { useImpacto, type ImpactoData } from "./impacto";
import {
  RISK_STATUS, RISK_CATEGORIES, ESCALA_PROB, ESCALA_IMPACTO, NIVEL_RIESGO, nivelRiesgo, severidad, riesgoVivo, riskStatusLabel, riskCategoryLabel, riskError,
  type ProjectRisk, type RiskStatus, type RiskCategory,
} from "@/lib/riesgos";
import { Plus, ShieldAlert, Loader2, Save, Pencil } from "lucide-react";

const INPUT = "input !py-2 text-[12.5px]";
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dia = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${Number(d)} ${MES[Number(m) - 1]} ${y.slice(2)}`; };
const tinte = (c: string, p = 14) => `color-mix(in srgb, ${c} ${p}%, var(--surface))`;

export function RiesgosView({ iniId, rev, onChanged }: { iniId: string | null; rev: number; onChanged: () => void }) {
  const { data, error } = useImpacto(rev);
  const [edit, setEdit] = useState<ProjectRisk | "nuevo" | null>(null);
  const [verCerrados, setVerCerrados] = useState(false);
  if (error) return <EmptyNote>{error}</EmptyNote>;
  if (!data) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  const todos = data.riesgos.filter((r) => !iniId || r.iniId === iniId);
  const vivos = todos.filter(riesgoVivo), cerrados = todos.filter((r) => !riesgoVivo(r));
  const lista = verCerrados ? todos : vivos;
  const nombre = (id: string) => data.proyectos.find((p) => p.iniId === id)?.name ?? id;
  const persona = (id?: string) => data.personas.find((p) => p.id === id)?.name;
  const editables = data.proyectos.filter((p) => data.editable[p.iniId]);
  const puedeCrear = iniId ? !!data.editable[iniId] : editables.length > 0;
  const celda = (prob: number, imp: number) => vivos.filter((r) => r.probability === prob && r.impact === imp);
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Card className="rise p-5">
          <div className="flex items-center justify-between gap-2"><div className="label">Matriz de riesgos vivos</div><span className="text-[12px] text-faint">probabilidad × impacto</span></div>
          <div className="mt-3 grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-1 text-[11px]">
            {[5, 4, 3, 2, 1].map((prob) => (
              <div key={prob} className="contents">
                <div className="flex items-center justify-end pr-1.5 text-right leading-tight text-muted">{ESCALA_PROB[prob - 1]}</div>
                {[1, 2, 3, 4, 5].map((imp) => { const rs = celda(prob, imp), nv = NIVEL_RIESGO[nivelRiesgo(prob * imp)]; return (
                  <div key={imp} className="grid aspect-[4/3] place-items-center rounded-md" style={{ background: tinte(nv.color, rs.length ? 34 : 12) }} title={`${ESCALA_PROB[prob - 1]} × ${ESCALA_IMPACTO[imp - 1]} · severidad ${prob * imp}${rs.length ? ` · ${rs.map((r) => r.title).join(" · ")}` : ""}`}>
                    {rs.length > 0 && <span className="num grid h-6 min-w-6 place-items-center rounded-full px-1 text-[12px] font-extrabold text-white" style={{ background: nv.color }}>{rs.length}</span>}
                  </div>
                ); })}
              </div>
            ))}
            <div />{ESCALA_IMPACTO.map((l) => <div key={l} className="pt-1 text-center leading-tight text-muted">{l}</div>)}
          </div>
          <p className="mt-3 text-[12px] leading-snug text-muted">Impacto de izquierda a derecha. Alto desde severidad 15, medio desde 8.</p>
        </Card>
        <div className="grid content-start gap-4 sm:grid-cols-2">
          {([["Riesgos vivos", vivos.length, "abiertos, en mitigación o materializados", undefined], ["De nivel alto", vivos.filter((r) => severidad(r) >= 15).length, "severidad de 15 o más", "var(--bad)"],
            ["Materializados", vivos.filter((r) => r.status === "MATERIALIZADO").length, "ya son un problema del proyecto", "var(--bad)"], ["En mitigación", vivos.filter((r) => r.status === "EN_MITIGACION").length, "con una respuesta en marcha", "var(--cyan-deep)"]] as const).map(([l, v, p, c]) => (
            <Card key={l} className="p-4"><div className="label">{l}</div><div className="num mt-1.5 text-[26px] font-extrabold leading-none text-ink" style={v && c ? { color: c } : undefined}>{v}</div><div className="mt-1.5 text-[12px] text-muted">{p}</div></Card>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title={`Registro de riesgos (${lista.length})`} sub={iniId ? nombre(iniId) : "de todos los proyectos, del más severo al menos"}
          right={<div className="flex flex-wrap items-center gap-2">
            {cerrados.length > 0 && <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-muted"><input type="checkbox" checked={verCerrados} onChange={(e) => setVerCerrados(e.target.checked)} /> Ver cerrados ({cerrados.length})</label>}
            {puedeCrear && <button type="button" onClick={() => setEdit("nuevo")} className="btn-primary btn-sm text-[12px]"><Plus size={13} /> Registrar riesgo</button>}
          </div>} />
        {lista.length ? (
          <ul className="divide-y divide-line">
            {lista.map((r) => { const sev = severidad(r), nv = NIVEL_RIESGO[nivelRiesgo(sev)], st = RISK_STATUS.find((s) => s.id === r.status)!; return (
              <li key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-5 py-3.5">
                <span className="num grid h-10 w-10 place-items-center rounded-xl text-[14px] font-extrabold text-white" style={{ background: riesgoVivo(r) ? nv.color : "var(--faint)" }} title={`Probabilidad ${r.probability} × impacto ${r.impact} · ${nv.label}`}>{sev}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5"><span className="text-[13.5px] font-bold leading-snug text-ink">{r.title}</span><span className={`chip ${st.chip} !py-0 text-[11px]`} title={st.desc}>{st.label}</span></div>
                  <div className="mt-0.5 text-[12px] text-muted">{!iniId && <>{nombre(r.iniId)} · </>}{riskCategoryLabel(r.category)}{persona(r.ownerId) ? ` · responde ${persona(r.ownerId)}` : ""}{r.due ? ` · respuesta al ${dia(r.due)}` : ""}{r.krs?.length ? ` · amenaza ${r.krs.join(", ")}` : ""}</div>
                  {r.desc && <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">{r.desc}</p>}
                  {r.mitigation && <p className="mt-1 text-[12.5px] leading-snug text-ink-soft"><b className="text-ink">{r.status === "MATERIALIZADO" ? "Cómo se atiende:" : "Respuesta:"}</b> {r.mitigation}</p>}
                </div>
                {data.editable[r.iniId] && <button type="button" onClick={() => setEdit(r)} className="rounded-md p-1.5 text-faint hover:bg-surface-2 hover:text-ink" title="Editar el riesgo" aria-label={`Editar el riesgo ${r.title}`}><Pencil size={14} /></button>}
              </li>
            ); })}
          </ul>
        ) : (
          <div className="px-5 py-6"><EmptyNote><ShieldAlert size={14} className="mr-1.5 inline" />{todos.length ? "No hay riesgos vivos: todos los registrados están cerrados." : "Aún no hay riesgos registrados. Un riesgo es algo que puede frenar el proyecto: se anota con su probabilidad, su impacto y la respuesta, y entra a la lectura de los resultados clave."}</EmptyNote></div>
        )}
      </Card>

      {edit && <RiesgoForm data={data} inicial={edit === "nuevo" ? null : edit} iniFijo={iniId} onClose={() => setEdit(null)} onDone={() => { setEdit(null); onChanged(); }} />}
    </div>
  );
}

function Escala15({ valor, onPick, etiquetas, nombre }: { valor: number; onPick: (n: number) => void; etiquetas: readonly string[]; nombre: string }) {
  return (
    <div role="radiogroup" aria-label={nombre}>
      <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={valor === n} onClick={() => onPick(n)} title={etiquetas[n - 1]}
        className={`num grid h-9 flex-1 place-items-center rounded-lg text-[13px] font-bold transition-colors ${valor === n ? "bg-navy text-white" : "bg-surface-2 text-ink-soft hover:bg-surface-3"}`}>{n}</button>)}</div>
      <div className="mt-1 text-[12px] text-muted">{etiquetas[valor - 1]}</div>
    </div>
  );
}

function RiesgoForm({ data, inicial, iniFijo, onClose, onDone }: { data: ImpactoData; inicial: ProjectRisk | null; iniFijo: string | null; onClose: () => void; onDone: () => void }) {
  const editables = data.proyectos.filter((p) => data.editable[p.iniId]);
  const [f, setF] = useState({
    iniId: inicial?.iniId ?? (iniFijo && data.editable[iniFijo] ? iniFijo : editables[0]?.iniId ?? ""), title: inicial?.title ?? "", desc: inicial?.desc ?? "", category: (inicial?.category ?? "CRONOGRAMA") as RiskCategory,
    probability: inicial?.probability ?? 3, impact: inicial?.impact ?? 3, status: (inicial?.status ?? "ABIERTO") as RiskStatus, ownerId: inicial?.ownerId ?? "", mitigation: inicial?.mitigation ?? "", due: inicial?.due ?? "", krs: inicial?.krs ?? [] as string[],
  });
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const krsIni = (data.pesos[f.iniId] ?? []).map((k) => k.code);
  const sev = f.probability * f.impact, nv = NIVEL_RIESGO[nivelRiesgo(sev)];
  const datos = { ...f, due: f.due || undefined, ownerId: f.ownerId || undefined, krs: f.krs.filter((k) => krsIni.includes(k)) };
  const invalido = riskError(datos);
  const enviar = async (body: Record<string, unknown>) => {
    setBusy(true); setError(null);
    const r = await fetch("/api/td/proyectos/riesgos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(false);
    if (!r?.ok) { setError(j?.error ?? "No se pudo guardar."); return false; }
    return true;
  };
  const guardar = async () => { if (await enviar({ op: "guardar", riesgo: { ...(inicial ? { id: inicial.id } : {}), ...datos } })) { avisar(inicial ? "Riesgo actualizado." : "Riesgo registrado."); onDone(); } };
  const eliminar = async () => { if (inicial && (await confirmarEliminar(`el riesgo «${inicial.title}»`)) && (await enviar({ op: "eliminar", id: inicial.id }))) { avisar("Riesgo eliminado."); onDone(); } };
  return (
    <Modal title={inicial ? `Riesgo · ${inicial.id}` : "Registrar riesgo"} sub="lo que puede frenar el proyecto: probabilidad, impacto y respuesta" onClose={onClose}
      footer={<>{inicial && <button type="button" onClick={() => void eliminar()} disabled={busy} className="btn-ghost mr-auto !py-2 text-[12px] text-bad">Eliminar</button>}
        <button type="button" onClick={onClose} className="btn-ghost !py-2 text-[12px]">Cancelar</button>
        <button type="button" onClick={() => void guardar()} disabled={busy || !!invalido || !f.iniId} className="btn-primary !py-2 text-[12.5px] disabled:opacity-40">{busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {inicial ? "Guardar" : "Registrar"}</button></>}>
      <div className="space-y-3">
        <Field label="Proyecto"><select value={f.iniId} onChange={(e) => setF({ ...f, iniId: e.target.value, krs: [] })} disabled={!!inicial} className={INPUT}>{(inicial ? data.proyectos.filter((p) => p.iniId === inicial.iniId) : editables).map((p) => <option key={p.iniId} value={p.iniId}>{p.iniId} · {p.name}</option>)}</select></Field>
        <Field label="Riesgo"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} placeholder="Qué puede pasar, en una frase" className={INPUT} /></Field>
        <Field label="Por qué puede pasar y qué afectaría (opcional)"><textarea value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} rows={2} maxLength={1200} className={`${INPUT} resize-y`} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Probabilidad"><Escala15 nombre="Probabilidad" valor={f.probability} onPick={(n) => setF({ ...f, probability: n })} etiquetas={ESCALA_PROB} /></Field>
          <Field label="Impacto"><Escala15 nombre="Impacto" valor={f.impact} onPick={(n) => setF({ ...f, impact: n })} etiquetas={ESCALA_IMPACTO} /></Field>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[12.5px] text-ink-soft" style={{ background: tinte(nv.color, 12) }}>
          <span className="num grid h-8 w-8 place-items-center rounded-lg text-[13px] font-extrabold text-white" style={{ background: nv.color }}>{sev}</span>
          Severidad {sev} de 25 · nivel {nv.label.toLowerCase()}. Mientras siga abierto resta hasta {(Math.round((sev / 25) * 8 * 10) / 10).toLocaleString("es-CO")} puntos a la confianza del proyecto.
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Categoría"><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as RiskCategory })} className={INPUT}>{RISK_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
          <Field label="Estado"><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as RiskStatus })} className={INPUT}>{RISK_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
        </div>
        <Field label={f.status === "MATERIALIZADO" ? "Cómo se atiende el problema" : "Respuesta: qué se hace para reducirlo"}><textarea value={f.mitigation} onChange={(e) => setF({ ...f, mitigation: e.target.value })} rows={2} maxLength={1200} placeholder={f.status === "ABIERTO" ? "Opcional mientras esté abierto" : "Obligatorio en este estado"} className={`${INPUT} resize-y`} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Quién responde"><select value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })} className={INPUT}><option value="">—</option>{data.personas.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.cargo}</option>)}</select></Field>
          <Field label="Fecha de la respuesta"><input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} className={`${INPUT} num`} /></Field>
        </div>
        {krsIni.length > 1 && (
          <Field label="Resultados clave que amenaza">
            <div className="flex flex-wrap gap-1.5">{krsIni.map((k) => { const on = f.krs.includes(k); return <button key={k} type="button" aria-pressed={on} onClick={() => setF({ ...f, krs: on ? f.krs.filter((x) => x !== k) : [...f.krs, k] })} className={`num rounded-full px-3 py-1 text-[12px] font-bold ${on ? "bg-navy text-white" : "bg-surface-2 text-ink-soft"}`}>{k}</button>; })}</div>
            <span className="mt-1 block text-[12px] text-faint">Sin elegir ninguno, se entiende que amenaza a todos los del proyecto.</span>
          </Field>
        )}
        {(error || (invalido && f.title.trim().length >= 5)) && <p className="rounded-lg px-3 py-2 text-[12.5px]" style={{ background: tinte("var(--bad)", 10), color: "var(--bad)" }}>{error ?? invalido}</p>}
        {inicial && <p className="text-[12px] text-faint">{riskStatusLabel(inicial.status)} · registrado el {dia(inicial.createdAt)} · última actualización {dia(inicial.updatedAt)}</p>}
      </div>
    </Modal>
  );
}

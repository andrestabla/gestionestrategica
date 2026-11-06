"use client";

// Articulación de una iniciativa entre áreas: qué áreas participan, cuál lidera, con qué prioridad, quién
// (persona del catálogo o equipo en texto libre) y qué debe hacer cada una. Panel lateral.

import { useState } from "react";
import { Modal, Field } from "@/components/ui";
import { ROL_AREA, type AreaArticulada, type RolArea } from "@/lib/cascada";
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, Save } from "lucide-react";

const INPUT = "input !py-2 text-[12px]";

export function ArticulacionModal({ ini, areas, people, initial, busy, onClose, onSave }: {
  ini: { id: string; name: string; ownerId: string };
  areas: { id: string; dependencia: string; cargo: string }[]; people: { id: string; name: string; cargo: string; responsibleId?: string }[];
  initial?: AreaArticulada[]; busy: boolean; onClose: () => void; onSave: (areas: AreaArticulada[]) => Promise<void>;
}) {
  const [filas, setFilas] = useState<AreaArticulada[]>(initial?.length ? initial.map((a) => ({ ...a })) : [{ areaId: ini.ownerId || areas[0]?.id || "", rol: "LIDERA", prioridad: 1, contribucion: "" }]);
  const set = (i: number, p: Partial<AreaArticulada>) => setFilas((f) => f.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const mover = (i: number, d: -1 | 1) => setFilas((f) => { const n = [...f]; const j = i + d; if (j < 0 || j >= n.length) return f; [n[i], n[j]] = [n[j], n[i]]; return n.map((x, k) => ({ ...x, prioridad: k + 1 })); });
  const quitar = (i: number) => setFilas((f) => f.filter((_, j) => j !== i).map((x, k) => ({ ...x, prioridad: k + 1 })));
  const agregar = () => { const libre = areas.find((a) => !filas.some((f) => f.areaId === a.id)); if (!libre) return; setFilas((f) => [...f, { areaId: libre.id, rol: "CONTRIBUYE", prioridad: f.length + 1, contribucion: "" }]); };
  const liderar = (i: number) => setFilas((f) => f.map((x, j) => ({ ...x, rol: j === i ? "LIDERA" : "CONTRIBUYE" })));
  const valido = filas.length > 0 && filas.every((f) => f.areaId && f.contribucion.trim().length >= 10) && new Set(filas.map((f) => f.areaId)).size === filas.length;
  const personasDe = (areaId: string) => people.filter((p) => p.responsibleId === areaId);

  return (
    <Modal title={`Articulación · ${ini.name}`} sub="Cada iniciativa es trabajo articulado entre áreas: declara quién lidera, quién contribuye, en qué orden, quién ejecuta y qué debe hacer cada una" onClose={onClose} wide
      footer={<><button type="button" onClick={onClose} className="btn-ghost btn-sm text-[12px]">Cancelar</button><button type="button" onClick={() => void onSave(filas.map((f, i) => ({ ...f, prioridad: i + 1 })))} disabled={busy || !valido} className="btn-primary btn-sm inline-flex items-center gap-1.5 text-[12px] disabled:opacity-40">{busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar articulación</button></>}>
      <div className="space-y-3">
        {filas.map((f, i) => (
          <div key={i} className={`rounded-xl border p-3 ${f.rol === "LIDERA" ? "border-cyan-deep/40 bg-cyan-wash/30" : "border-line"}`}>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <Field label={`Área · prioridad ${i + 1}`}><select value={f.areaId} onChange={(e) => set(i, { areaId: e.target.value, persona: undefined })} className={INPUT}>{areas.map((a) => <option key={a.id} value={a.id} disabled={filas.some((x, j) => j !== i && x.areaId === a.id)}>{a.dependencia || a.cargo}</option>)}</select></Field>
              <Field label="Rol"><div className="flex gap-1 pt-0.5">{(["LIDERA", "CONTRIBUYE"] as RolArea[]).map((r) => <button key={r} type="button" onClick={() => (r === "LIDERA" ? liderar(i) : set(i, { rol: "CONTRIBUYE" }))} className={`chip ${f.rol === r ? "chip-cyan" : ""}`}>{ROL_AREA[r]}</button>)}</div></Field>
              <Field label="Orden"><div className="flex gap-1 pt-0.5"><button type="button" onClick={() => mover(i, -1)} className="btn-ghost btn-sm !px-2" title="Subir"><ArrowUp size={12} /></button><button type="button" onClick={() => mover(i, 1)} className="btn-ghost btn-sm !px-2" title="Bajar"><ArrowDown size={12} /></button><button type="button" onClick={() => quitar(i)} className="btn-ghost btn-sm !px-2 text-bad" title="Quitar"><Trash2 size={12} /></button></div></Field>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Field label="Persona o equipo" help="Del catálogo de personas del área, o escribe el equipo o cargo.">
                <input list={`personas-${i}`} value={f.persona ?? ""} onChange={(e) => set(i, { persona: e.target.value })} placeholder="p. ej. Jefe de planeación · equipo de visita virtual" className={INPUT} />
                <datalist id={`personas-${i}`}>{personasDe(f.areaId).map((p) => <option key={p.id} value={`${p.name} · ${p.cargo}`} />)}</datalist>
              </Field>
              <Field label="Entrega o verificación" help="Para cuándo o cómo se comprueba."><input value={f.entrega ?? ""} onChange={(e) => set(i, { entrega: e.target.value })} placeholder="p. ej. integración en producción el 31 de marzo" className={INPUT} /></Field>
              <Field label="Qué debe hacer esta área" help="Su contribución concreta a la iniciativa: un entregable, no una intención." className="sm:col-span-2"><textarea value={f.contribucion} onChange={(e) => set(i, { contribucion: e.target.value })} rows={2} maxLength={400} placeholder="p. ej. Integrar el CRM con la plataforma de contenido y depurar el maestro de médicos" className={INPUT} /></Field>
            </div>
          </div>
        ))}
        <button type="button" onClick={agregar} disabled={filas.length >= Math.min(8, areas.length)} className="btn-ghost btn-sm inline-flex items-center gap-1 text-[12px] disabled:opacity-40"><Plus size={12} /> Agregar área</button>
        {!valido && filas.length > 0 && <p className="text-[12px] text-faint">Cada área necesita su contribución (al menos 10 caracteres) y no puede repetirse.</p>}
      </div>
    </Modal>
  );
}

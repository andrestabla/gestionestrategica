"use client";

// Formulario de empresa (crear y editar) en modal: identidad, sector, país,
// moneda y horizontes de planeación. Lo usan Administración → Empresas y la
// pantalla de elección de empresa del admin.

import { useState } from "react";
import { Modal } from "@/components/ui";
import { Loader2, Save, Building2, X } from "lucide-react";
import { INSTRUMENTS, ALL_INSTRUMENTS } from "@/lib/instrumentos";

export type HorizonLite = { id: string; label: string; months: number };
export type CompanyLite = { slug: string; name: string; shortName: string; city: string; department: string; sector: string; size: string; sectorKey: string; ciiu: string; active: boolean; template?: string; createdBy?: string; createdAt?: string; country?: "CO" | "EC"; currency?: "COP" | "USD"; horizons?: HorizonLite[]; typeRule?: { id?: string; criteria: { key: string; name: string }[]; min: number } | null; mode?: "completa" | "convencion" | "acompanamiento"; instruments?: string[] };
export const DEFAULT_HZ: HorizonLite[] = [{ id: "CORTO", label: "Corto plazo", months: 12 }, { id: "MEDIANO", label: "Mediano plazo", months: 36 }];

/** Horizontes de planeación de la empresa (ordenan el roadmap y la priorización). */
export function HorizonsEditor({ value, onChange }: { value: HorizonLite[]; onChange: (h: HorizonLite[]) => void }) {
  const upd = (i: number, k: keyof HorizonLite, v: string) => onChange(value.map((h, j) => j === i ? { ...h, [k]: k === "months" ? Number(v) : v } : h));
  return (
    <div className="space-y-1.5 rounded-lg border border-line bg-surface-2/40 p-2.5">
      <div className="flex items-center justify-between">
        <span className="label !text-[8.5px]">Horizontes de planeación</span>
        {value.length < 6 && (
          <button type="button" onClick={() => onChange([...value, { id: `H${value.length + 1}`, label: `Horizonte ${value.length + 1}`, months: (value[value.length - 1]?.months ?? 0) + 12 }])}
            className="text-[10.5px] font-semibold text-cyan-deep hover:underline">+ añadir</button>
        )}
      </div>
      {value.map((h, i) => (
        <div key={i} className="grid grid-cols-[64px_1fr_72px_20px] items-center gap-1.5">
          <input value={h.id} onChange={(e) => upd(i, "id", e.target.value.toUpperCase())} placeholder="H1" className="input !py-1 !text-[11px]" title="Identificador" />
          <input value={h.label} onChange={(e) => upd(i, "label", e.target.value)} placeholder="Etiqueta" className="input !py-1 !text-[11px]" />
          <input type="number" min={1} max={240} value={h.months} onChange={(e) => upd(i, "months", e.target.value)} className="input num !py-1 !text-[11px]" title="Meses" />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} disabled={value.length <= 1} title="Quitar"
            className="text-faint hover:text-bad disabled:opacity-30"><X size={12} /></button>
        </div>
      ))}
      <p className="text-[10px] leading-snug text-faint">Identificador, etiqueta y plazo en meses, de menor a mayor. Cada iniciativa se ubica en uno; el portafolio se ordena dentro de cada horizonte.</p>
    </div>
  );
}

export function CompanyForm({ saving, initial, onSubmit, onCancel }: {
  saving: boolean; initial: CompanyLite | null;
  onSubmit: (input: Record<string, unknown>) => Promise<boolean>; onCancel: () => void;
}) {
  const [f, setF] = useState({
    name: initial?.name ?? "", shortName: initial?.shortName ?? "", city: initial?.city ?? "", department: initial?.department ?? "",
    sector: initial?.sector ?? "", size: initial?.size ?? "", ciiu: initial?.ciiu ?? "", sectorKey: initial?.sectorKey ?? "suministros-industriales", template: "vacia",
    country: initial?.country ?? "CO", currency: initial?.currency ?? "COP",
    typeRule: initial?.typeRule?.id ?? (initial?.typeRule?.criteria?.length ? "propia" : "4shine"),
    mode: initial?.mode ?? "completa",
    slug: initial?.slug ?? "",
  });
  const [horizons, setHorizons] = useState<HorizonLite[]>(initial?.horizons?.length ? initial.horizons : DEFAULT_HZ);
  // instrumentos del diagnóstico habilitados: sin configuración, todos
  const [instruments, setInstruments] = useState<string[]>(initial?.instruments?.length ? initial.instruments : [...ALL_INSTRUMENTS]);
  const toggleInstrument = (id: string) => setInstruments((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={initial ? `Editar · ${initial.name}` : "Nueva empresa"} sub={initial ? "identidad, sector y horizontes de planeación" : "nace activa; elige si parte vacía o de la plantilla demo"} onClose={onCancel}
      footer={<>
        <button type="button" onClick={onCancel} className="btn-ghost !py-2 text-[12px]">Cancelar</button>
        <button type="button" onClick={async () => {
            const { slug: slugField, typeRule, ...rest } = f;
            const tr = typeRule === "propia" ? undefined : typeRule;   // «propia» (regla definida por API) se conserva tal cual
            const input = initial ? { ...rest, horizons, instruments, ...(tr ? { typeRule: tr } : {}), newSlug: slugField } : { ...rest, horizons, instruments, typeRule: tr ?? "4shine", slug: slugField || undefined };
            if (await onSubmit(input) && !initial) setF({ ...f, name: "", shortName: "", city: "", department: "", sector: "", size: "", ciiu: "", slug: "" });
          }}
          disabled={saving || f.name.trim().length < 3 || instruments.length === 0}
          className="btn-primary !py-2 text-[12.5px] disabled:opacity-40">
          {saving ? <Loader2 size={13} className="animate-spin" /> : initial ? <Save size={13} /> : <Building2 size={13} />}
          {initial ? "Guardar cambios" : "Crear empresa"}
        </button>
      </>}>
      <div className="space-y-2.5">
        <input value={f.name} onChange={set("name")} placeholder="Nombre de la empresa" className="input !py-2 text-[12px]" />
        <div>
          <input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder={initial ? "identificador" : "Identificador en la URL (opcional: se toma del nombre)"} className="input num !py-2 text-[12px]" title="Identificador único de la empresa en la URL" />
          <p className="num mt-1 text-[10px] text-faint">Rutas de la empresa: /{f.slug || "empresa"}/login · /{f.slug || "empresa"}/panel{initial && f.slug !== initial.slug ? " · al cambiarlo, sus usuarios vuelven a entrar por la nueva ruta" : ""}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={f.shortName} onChange={set("shortName")} placeholder="Nombre corto" className="input !py-2 text-[12px]" />
          <input value={f.ciiu} onChange={set("ciiu")} placeholder="CIIU (G4659)" className="input !py-2 text-[12px]" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={f.city} onChange={set("city")} placeholder="Ciudad" className="input !py-2 text-[12px]" />
          <input value={f.department} onChange={set("department")} placeholder="Departamento" className="input !py-2 text-[12px]" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={f.country} onChange={set("country")} className="input !py-2 text-[12px]" title="País: define el mapa territorial y el benchmark">
            <option value="CO">Colombia (departamentos)</option>
            <option value="EC">Ecuador (provincias)</option>
          </select>
          <select value={f.currency} onChange={set("currency")} className="input !py-2 text-[12px]" title="Moneda de las cifras financieras">
            <option value="COP">COP (pesos colombianos)</option>
            <option value="USD">USD (dólares)</option>
          </select>
        </div>
        <input value={f.sector} onChange={set("sector")} placeholder="Sector (p. ej. Distribución de suministros)" className="input !py-2 text-[12px]" />
        <input value={f.size} onChange={set("size")} placeholder="Tamaño (p. ej. 85 colaboradores · 3 sedes)" className="input !py-2 text-[12px]" />
        <HorizonsEditor value={horizons} onChange={setHorizons} />
        <div className="rounded-xl border border-line px-3 py-2.5">
          <span className="label !text-[8.5px]">Instrumentos del diagnóstico habilitados</span>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {INSTRUMENTS.map((i) => (
              <label key={i.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-[11.5px] hover:bg-surface-2" title={i.desc}>
                <input type="checkbox" checked={instruments.includes(i.id)} onChange={() => toggleInstrument(i.id)} className="mt-0.5" />
                <span className="text-ink">{i.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-[10px] leading-snug text-faint">Lo no habilitado no aparece en el módulo de diagnóstico ni acepta respuestas. Al menos uno.</p>
        </div>
        <div>
          <select value={f.mode} onChange={set("mode")} className="input !py-2 text-[12px]" title="Qué ve el menú de la empresa">
            <option value="completa">Modo completo · todos los módulos</option>
            <option value="convencion">Modo convención · solo Dirección, OKR, Iniciativas → KR, Priorización en vivo y Portafolio, con QR de acceso por sección</option>
            <option value="acompanamiento">Modo acompañamiento · Diagnóstico, Prioridades estratégicas, Objetivos directivos, Resultados clave, Iniciativas, Priorización, Portafolio e Inteligencia, con cuentas (sin QR)</option>
          </select>
        </div>
        <div>
          <select value={f.typeRule} onChange={set("typeRule")} className="input !py-2 text-[12px]" title="Regla con la que la matriz clasifica cada iniciativa como estratégica o táctica">
            <option value="4shine">Tipo estratégica/táctica · regla general (4 marcas: contribución, profundidad, alcance, permanencia; 3 o más = estratégica)</option>
            <option value="cresio">Tipo estratégica/táctica · regla Cresio (3 criterios obligatorios: impacto, transversalidad, potencial y madurez)</option>
            {f.typeRule === "propia" && <option value="propia">Tipo estratégica/táctica · regla propia (definida por API)</option>}
          </select>
          <p className="mt-1 text-[10px] leading-snug text-faint">Con la regla Cresio, lo táctico se transfiere al área de mayor responsabilidad y no admite «implementar» ni «preparar». Cambiar la regla no borra evaluaciones, pero las marcas de criterios que ya no existen dejan de contar.</p>
        </div>
        {!initial && (
          <select value={f.template} onChange={set("template")} className="input !py-2 text-[12px]">
            <option value="vacia">Empezar vacía (solo el mapa de capacidades)</option>
            <option value="demo">Copiar la plantilla demo (objetivos, KPI, iniciativas, personas y tareas de ejemplo)</option>
          </select>
        )}
      </div>
    </Modal>
  );
}

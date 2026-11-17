"use client";

// Administración → Tour: el recorrido guiado de la empresa. El equipo consultor lo activa, decide para quién se abre
// solo (cuentas de solo lectura o todas) y edita sus pasos: título, texto, la pantalla a la que lleva y, si quiere, el
// elemento que resalta. Cada guardado sube la versión, así quien ya lo vio lo vuelve a ver con los cambios.

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Wand2, Save, Compass } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import { useCatalog } from "@/components/catalog-context";
import { avisar, confirmar } from "@/components/feedback";
import { tourSugerido, TOUR_MAX_PASOS, type Tour, type PasoTour } from "@/lib/tour";

const nuevoId = () => `p${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

export function TourTab() {
  const v = useCatalog();
  const company = v.catalog.company;
  const sugerido = useMemo(() => tourSugerido(company), [company]);
  const rutas = useMemo(() => [...new Set(sugerido.pasos.map((p) => p.ruta))], [sugerido]);
  const [tour, setTour] = useState<Tour | null>(null);
  const [cargado, setCargado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cambios, setCambios] = useState(false);

  useEffect(() => {
    fetch("/api/td/tour", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => { setTour(j?.tour ?? null); setCargado(true); }).catch(() => setCargado(true));
  }, []);

  const editar = (t: Tour) => { setTour(t); setCambios(true); };
  const paso = (i: number, patch: Partial<PasoTour>) => tour && editar({ ...tour, pasos: tour.pasos.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const mover = (i: number, d: -1 | 1) => { if (!tour) return; const ps = [...tour.pasos]; const k = i + d; if (k < 0 || k >= ps.length) return; [ps[i], ps[k]] = [ps[k], ps[i]]; editar({ ...tour, pasos: ps }); };
  const quitar = (i: number) => tour && editar({ ...tour, pasos: tour.pasos.filter((_, j) => j !== i) });
  const agregar = () => editar({ ...(tour ?? { activo: true, audiencia: "lectura", version: 1, pasos: [] }), pasos: [...(tour?.pasos ?? []), { id: nuevoId(), titulo: "", texto: "", ruta: "/panel" }] });
  const cargarSugerido = async () => {
    if (tour?.pasos.length && !(await confirmar({ title: "¿Reemplazar los pasos por el tour sugerido?", body: "Se cargan un paso de bienvenida, uno por cada módulo del menú de la empresa y un cierre. Puedes editarlos antes de guardar.", confirmLabel: "Reemplazar" }))) return;
    editar({ ...sugerido, activo: tour?.activo ?? true, audiencia: tour?.audiencia ?? "lectura" });
  };
  const guardar = async () => {
    setGuardando(true); setError(null);
    try {
      const r = await fetch("/api/td/tour", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tour }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      setTour(j.tour); setCambios(false);
      avisar(j.tour?.activo ? "Tour guardado y activo. Ábrelo con el botón «Tour» de la barra superior para verlo." : "Tour guardado (inactivo).");
    } finally { setGuardando(false); }
  };
  const eliminar = async () => {
    if (!(await confirmar({ title: "¿Eliminar el tour?", body: "Nadie lo volverá a ver hasta que se cree uno nuevo.", confirmLabel: "Eliminar", danger: true }))) return;
    setGuardando(true); setError(null);
    const r = await fetch("/api/td/tour", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tour: null }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setError(j.error ?? `Error ${r.status}`); else { setTour(null); setCambios(false); avisar("Tour eliminado."); }
    setGuardando(false);
  };

  if (!cargado) return <p className="text-[13px] text-muted">Cargando el tour…</p>;
  return (
    <div className="space-y-5">
      <Card className="rise">
        <CardHeader title={`Tour guiado de ${company.name}`} sub="un recorrido por los módulos que se abre al entrar al panel; siempre se puede abrir con el botón «Tour» de la barra superior"
          right={<span className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void cargarSugerido()} className="btn-ghost btn-sm text-[12px]"><Wand2 size={13} /> Cargar tour sugerido</button>
            {tour && <button type="button" onClick={() => void eliminar()} disabled={guardando} className="btn-ghost btn-sm text-[12px] disabled:opacity-50"><Trash2 size={13} /> Eliminar</button>}
            <button type="button" onClick={() => void guardar()} disabled={guardando || !tour || !cambios} className="btn-primary btn-sm text-[12px] disabled:opacity-50"><Save size={13} /> {guardando ? "Guardando…" : "Guardar"}</button>
          </span>} />
        {!tour ? (
          <div className="px-5 pb-5 text-[13px] text-muted">
            <p>Esta empresa no tiene tour. Carga el sugerido (un paso por módulo de su menú) y ajústalo, o crea los pasos uno a uno.</p>
            <button type="button" onClick={agregar} className="btn-ghost btn-sm mt-3 text-[12px]"><Plus size={13} /> Crear el primer paso</button>
          </div>
        ) : (
          <div className="grid gap-4 px-5 pb-5 md:grid-cols-3">
            <label className="flex items-center gap-2 rounded-xl bg-surface-2/60 px-4 py-3 text-[13px] font-semibold text-ink">
              <input type="checkbox" checked={tour.activo} onChange={(e) => editar({ ...tour, activo: e.target.checked })} /> Tour activo
            </label>
            <label className="rounded-xl bg-surface-2/60 px-4 py-3 text-[12.5px]">
              <span className="label">Se abre solo para</span>
              <select className="input mt-1 w-full" value={tour.audiencia} onChange={(e) => editar({ ...tour, audiencia: e.target.value === "todos" ? "todos" : "lectura" })}>
                <option value="lectura">Las cuentas de solo lectura (demostración)</option>
                <option value="todos">Todas las cuentas de la empresa</option>
              </select>
            </label>
            <div className="rounded-xl bg-surface-2/60 px-4 py-3 text-[12.5px] text-muted">
              <span className="label">Estado</span>
              <p className="mt-1">{tour.pasos.length} de {TOUR_MAX_PASOS} pasos · versión {tour.version}{tour.by ? ` · ${tour.by}` : ""}{cambios ? " · cambios sin guardar" : ""}</p>
            </div>
          </div>
        )}
      </Card>

      {tour && (
        <Card className="rise rise-1">
          <CardHeader title="Pasos del recorrido" sub="en este orden; cada paso lleva a su pantalla. El ancla es opcional: un selector CSS del elemento que se resalta (por ejemplo, main h1)" />
          <datalist id="tour-rutas">{rutas.map((r) => <option key={r} value={r} />)}</datalist>
          <ol className="space-y-3 px-5 pb-5">
            {tour.pasos.map((p, i) => (
              <li key={p.id} className="rounded-xl border border-line bg-surface px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-[12px] font-extrabold text-cyan-deep">{i + 1}</span>
                  <input className="input flex-1 text-[13px] font-semibold" placeholder="Título del paso" value={p.titulo} onChange={(e) => paso(i, { titulo: e.target.value })} />
                  <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="btn-ghost btn-sm disabled:opacity-30" aria-label="Subir"><ArrowUp size={13} /></button>
                  <button type="button" onClick={() => mover(i, 1)} disabled={i === tour.pasos.length - 1} className="btn-ghost btn-sm disabled:opacity-30" aria-label="Bajar"><ArrowDown size={13} /></button>
                  <button type="button" onClick={() => quitar(i)} className="btn-ghost btn-sm" aria-label="Quitar el paso"><Trash2 size={13} /></button>
                </div>
                <textarea className="input mt-2 min-h-[70px] w-full text-[12.5px]" placeholder="Qué mirar en esta pantalla y por qué importa" value={p.texto} onChange={(e) => paso(i, { texto: e.target.value })} />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-[12px] text-muted">Pantalla<input className="input mt-0.5 w-full text-[12.5px]" list="tour-rutas" value={p.ruta} onChange={(e) => paso(i, { ruta: e.target.value })} /></label>
                  <label className="text-[12px] text-muted">Ancla (opcional)<input className="input mt-0.5 w-full text-[12.5px]" placeholder="main h1" value={p.ancla ?? ""} onChange={(e) => paso(i, { ancla: e.target.value || undefined })} /></label>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex items-center gap-2 border-t border-line px-5 py-3">
            <button type="button" onClick={agregar} disabled={tour.pasos.length >= TOUR_MAX_PASOS} className="btn-ghost btn-sm text-[12px] disabled:opacity-50"><Plus size={13} /> Agregar paso</button>
            <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-faint"><Compass size={12} /> Tras guardar, ábrelo con «Tour» en la barra superior para verlo como lo verá el visitante.</span>
          </div>
          {error && <p className="border-t border-line px-5 py-3 text-[12.5px]" style={{ color: "var(--bad-text)" }}>{error}</p>}
        </Card>
      )}
      {error && !tour && <p className="text-[12.5px]" style={{ color: "var(--bad-text)" }}>{error}</p>}
    </div>
  );
}

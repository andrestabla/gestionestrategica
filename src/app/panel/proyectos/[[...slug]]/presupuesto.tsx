"use client";

// Gestión de proyectos · presupuesto ejecutado contra avance. Por proyecto: lo planeado, lo
// comprometido y lo ejecutado frente al avance del plan de trabajo, con el valor ganado, el índice
// de costo y la proyección al cierre. Con un proyecto elegido, además, el registro de compromisos y
// ejecuciones y el formulario para anotar uno. La lectura la calcula el servidor (src/lib/presupuesto.ts).

import { useState } from "react";
import { Card, CardHeader, EmptyNote, Field, Modal, Skeleton } from "@/components/ui";
import { avisar, confirmarEliminar } from "@/components/feedback";
import { formatoMiles, leerMonto } from "@/lib/dinero";
import { useImpacto, type ImpactoData } from "./impacto";
import { ESTADO_PRESUPUESTO, GASTO_TIPOS, REGLAS_PRESUPUESTO, dinero, dineroCorto, gastoError, gastoTipoLabel, totalesPorMoneda, type Gasto, type GastoTipo, type PresupuestoProyecto } from "@/lib/presupuesto";
import type { PulsoProyecto } from "@/lib/impacto-kr";
import { Plus, Wallet, Loader2, Save, Trash2, Info } from "lucide-react";

const INPUT = "input !py-2 text-[12.5px]";
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dia = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${Number(d)} ${MES[Number(m) - 1]} ${y.slice(2)}`; };
const f0 = (n: number) => Math.round(n).toLocaleString("es-CO");
const f2 = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tinte = (c: string, p = 12) => `color-mix(in srgb, ${c} ${p}%, var(--surface))`;

/** Barra de presupuesto: ejecutado (lleno), comprometido (claro), con la marca del avance del trabajo y el límite de lo planeado. */
function BarraPresupuesto({ p, avance, alto = 12 }: { p: PresupuestoProyecto; avance: number | null; alto?: number }) {
  const tope = Math.max(p.planeado, p.comprometido, p.ejecutado) || 1, w = (n: number) => `${Math.min(100, (n / tope) * 100)}%`;
  const excede = p.ejecutado > p.planeado;
  return (
    <div className="relative w-full rounded-full bg-surface-3" style={{ height: alto }} role="img"
      aria-label={`Ejecutado ${f0(p.pctEjecutado ?? 0)} %, comprometido ${f0(p.pctComprometido ?? 0)} %${avance !== null ? `, avance del trabajo ${f0(avance)} %` : ""}`}>
      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: w(p.comprometido), background: "color-mix(in srgb, var(--navy) 28%, var(--surface-3))" }} />
      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: w(p.ejecutado), background: excede ? "var(--bad)" : "var(--navy)" }} />
      {tope > p.planeado && <span className="absolute top-[-3px] h-[calc(100%+6px)] border-l-2 border-dashed border-ink" style={{ left: w(p.planeado) }} title={`Presupuesto planeado: ${dinero(p.planeado, p.moneda)}`} />}
      {avance !== null && <span className="absolute top-[-4px] h-[calc(100%+8px)] w-[3px] rounded bg-[var(--gold-fill)]" style={{ left: `calc(${w((p.planeado * avance) / 100)} - 1.5px)` }} title={`Avance del trabajo: ${f0(avance)} % (valor ganado ${dinero(p.valorGanado ?? 0, p.moneda)})`} />}
    </div>
  );
}
function ChipEstado({ p }: { p: PresupuestoProyecto }) { const e = ESTADO_PRESUPUESTO[p.estado]; return <span className={`chip ${e.chip}`} title={e.desc}>{e.label}</span>; }
function Lectura({ p, avance }: { p: PresupuestoProyecto; avance: number | null }) {
  if (p.brecha === null) return <span className="text-muted">{avance === null ? "Sin plan de trabajo: no hay avance con qué comparar." : "Sin ejecución registrada."}</span>;
  const min = REGLAS_PRESUPUESTO.brechaMinima;
  return p.brecha >= min ? <span style={{ color: "var(--bad)" }}>Gasta más rápido de lo que avanza: {f0(p.brecha)} puntos de diferencia.</span>
    : p.brecha <= -min ? <span style={{ color: "var(--ok)" }}>Avanza más de lo que gasta: {f0(-p.brecha)} puntos a favor.</span> : <span className="text-muted">Lo ejecutado va acorde con lo avanzado.</span>;
}

export function PresupuestoView({ iniId, rev, onChanged, onOpenIni }: { iniId: string | null; rev: number; onChanged: () => void; onOpenIni: (id: string | null) => void }) {
  const { data, error } = useImpacto(rev);
  const [nuevo, setNuevo] = useState(false);
  if (error) return <EmptyNote>{error}</EmptyNote>;
  if (!data) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  const p = iniId ? data.proyectos.find((x) => x.iniId === iniId) ?? null : null;
  return (
    <div className="space-y-5">
      {p ? <DeProyecto data={data} p={p} onNuevo={() => setNuevo(true)} onChanged={onChanged} /> : <DePortafolio data={data} onOpenIni={onOpenIni} />}
      <details className="group rounded-2xl bg-surface shadow-[var(--e1)]">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-[13px] font-bold text-ink"><Info size={15} className="text-cyan-deep" /> Cómo se lee el presupuesto</summary>
        <div className="space-y-2 border-t border-line px-5 py-4 text-[12.5px] leading-relaxed text-ink-soft">
          <p><b className="text-ink">Planeado</b> es el presupuesto de la ficha de la iniciativa. <b className="text-ink">Comprometido</b> es lo contratado u obligado; <b className="text-ink">ejecutado</b>, lo gastado o pagado. Lo que la ficha ya traía cuenta como saldo de apertura y los movimientos registrados aquí se suman.</p>
          <p><b className="text-ink">Valor ganado</b> = presupuesto planeado × avance del plan de trabajo: lo que debería haber costado lo que ya está hecho. <b className="text-ink">Índice de costo</b> = valor ganado ÷ ejecutado: por debajo de 1, cada peso rinde menos de lo planeado.</p>
          <p><b className="text-ink">Proyección al cierre</b> = ejecutado ÷ avance: lo que costaría terminar si el dinero sigue rindiendo igual. Se calcula desde {REGLAS_PRESUPUESTO.avanceMinimoProyeccion} % de avance.</p>
          <p><b className="text-ink">Alerta</b> cuando lo ejecutado va {REGLAS_PRESUPUESTO.brechaMinima} puntos o más por encima del avance, cuando lo comprometido supera lo planeado o cuando la proyección pasa del {f0((1 + REGLAS_PRESUPUESTO.toleranciaProyeccion) * 100)} % de lo planeado. <b className="text-ink">Sobrecosto</b> cuando lo ejecutado ya supera lo planeado. Las dos primeras restan confianza de entrega en el tablero de impacto.</p>
        </div>
      </details>
      {nuevo && p && <GastoForm p={p} hoy={data.hoy} onClose={() => setNuevo(false)} onDone={() => { setNuevo(false); onChanged(); }} />}
    </div>
  );
}

function DePortafolio({ data, onOpenIni }: { data: ImpactoData; onOpenIni: (id: string | null) => void }) {
  const con = data.proyectos.filter((p) => p.presupuesto.planeado > 0), sin = data.proyectos.length - con.length;
  const totales = totalesPorMoneda(con.map((p) => p.presupuesto));
  const orden: Record<string, number> = { SOBRECOSTO: 0, ALERTA: 1, EN_LINEA: 2, SIN_EJECUCION: 3, SIN_PRESUPUESTO: 4 };
  const filas = [...con].sort((a, b) => orden[a.presupuesto.estado] - orden[b.presupuesto.estado] || (b.presupuesto.brecha ?? -999) - (a.presupuesto.brecha ?? -999));
  if (!con.length) return (
    <Card className="p-6 sm:p-8">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold-wash)] text-[var(--gold)]"><Wallet size={20} /></span>
      <h3 className="mt-4 text-[18px] font-extrabold text-ink">Ningún proyecto tiene presupuesto planeado</h3>
      <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-ink-soft">El presupuesto planeado se define en la ficha de cada iniciativa. Con él, aquí se registran los compromisos y las ejecuciones y se comparan con el avance del plan de trabajo.</p>
    </Card>
  );
  return (
    <>
      {totales.map((t) => { const brecha = t.pctEjecutado !== null && t.pctAvance !== null ? t.pctEjecutado - t.pctAvance : null; return (
        <div key={t.moneda} className="rise grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([["Planeado", dineroCorto(t.planeado, t.moneda), `${t.proyectos} ${t.proyectos === 1 ? "proyecto" : "proyectos"} con presupuesto en ${t.moneda}`, undefined],
            ["Comprometido", dineroCorto(t.comprometido, t.moneda), `${f0((t.comprometido / t.planeado) * 100)} % de lo planeado`, t.comprometido > t.planeado ? "var(--bad)" : undefined],
            ["Ejecutado", dineroCorto(t.ejecutado, t.moneda), `${f0(t.pctEjecutado ?? 0)} % de lo planeado`, t.ejecutado > t.planeado ? "var(--bad)" : undefined],
            ["Avance del trabajo", t.pctAvance === null ? "—" : `${f0(t.pctAvance)} %`, brecha === null ? "Sin plan de trabajo que comparar" : brecha >= REGLAS_PRESUPUESTO.brechaMinima ? `Se ha gastado ${f0(brecha)} puntos más de lo avanzado` : brecha <= -REGLAS_PRESUPUESTO.brechaMinima ? `Se ha avanzado ${f0(-brecha)} puntos más de lo gastado` : "Acorde con lo ejecutado", brecha !== null && brecha >= REGLAS_PRESUPUESTO.brechaMinima ? "var(--bad)" : undefined]] as const).map(([l, v, pie, c]) => (
            <Card key={l} className="p-4 sm:p-5"><div className="label">{l}</div><div className="num mt-2 text-[24px] font-extrabold leading-none text-ink" style={c ? { color: c } : undefined}>{v}</div><div className="mt-2 text-[12px] leading-snug text-muted">{pie}</div></Card>
          ))}
        </div>
      ); })}
      <Card className="overflow-hidden">
        <CardHeader title={`Presupuesto por proyecto (${con.length})`} sub="barra oscura: ejecutado · clara: comprometido · marca dorada: avance del trabajo" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-[12.5px]">
            <thead><tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-[0.08em] text-faint"><th className="px-5 py-2.5">Proyecto</th><th className="px-3 py-2.5 text-right">Planeado</th><th className="px-3 py-2.5">Ejecutado y avance</th><th className="px-3 py-2.5 text-right">Índice de costo</th><th className="px-3 py-2.5 text-right">Proyección al cierre</th><th className="px-3 py-2.5">Estado</th></tr></thead>
            <tbody>{filas.map((x) => { const b = x.presupuesto; return (
              <tr key={x.iniId} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-2/60" onClick={() => onOpenIni(x.iniId)}>
                <td className="px-5 py-3"><div className="max-w-[280px] font-bold leading-snug text-ink">{x.name}</div><div className="num text-[12px] text-faint">{x.iniId} · {data.responsables[x.ownerId] ?? "sin sponsor"}</div></td>
                <td className="num px-3 py-3 text-right font-semibold text-ink">{dinero(b.planeado, b.moneda)}</td>
                <td className="w-[250px] px-3 py-3"><BarraPresupuesto p={b} avance={x.avance} alto={9} /><div className="num mt-1.5 text-[12px] text-muted">{f0(b.pctEjecutado ?? 0)} % ejecutado · {x.avance === null ? "sin plan de trabajo" : `${f0(x.avance)} % de avance`}</div></td>
                <td className="num px-3 py-3 text-right font-bold" style={{ color: b.indiceCosto === null ? "var(--faint)" : b.indiceCosto < 0.9 ? "var(--bad)" : b.indiceCosto > 1.1 ? "var(--ok)" : "var(--ink)" }}>{b.indiceCosto === null ? "—" : f2(b.indiceCosto)}</td>
                <td className="num px-3 py-3 text-right">{b.proyeccion === null ? <span className="text-faint">—</span> : <><span className="font-semibold text-ink">{dinero(b.proyeccion, b.moneda)}</span>{b.sobrecosto !== null && Math.abs(b.sobrecosto) > b.planeado * 0.01 && <div className="text-[12px]" style={{ color: b.sobrecosto > 0 ? "var(--bad)" : "var(--ok)" }}>{b.sobrecosto > 0 ? "+" : "−"}{f0((Math.abs(b.sobrecosto) / b.planeado) * 100)} %</div>}</>}</td>
                <td className="px-3 py-3"><ChipEstado p={b} /></td>
              </tr>
            ); })}</tbody>
          </table>
        </div>
        {sin > 0 && <p className="border-t border-line px-5 py-3 text-[12px] text-muted">{sin} {sin === 1 ? "proyecto no tiene" : "proyectos no tienen"} presupuesto planeado en su ficha y no {sin === 1 ? "aparece" : "aparecen"} aquí.</p>}
      </Card>
    </>
  );
}

function DeProyecto({ data, p, onNuevo, onChanged }: { data: ImpactoData; p: PulsoProyecto; onNuevo: () => void; onChanged: () => void }) {
  const b = p.presupuesto, gastos = data.gastos.filter((g) => g.iniId === p.iniId), editable = !!data.editable[p.iniId];
  const [borrando, setBorrando] = useState<string | null>(null);
  const eliminar = async (g: Gasto) => {
    if (!(await confirmarEliminar(`el movimiento «${g.concepto}»`))) return;
    setBorrando(g.id);
    const r = await fetch("/api/td/proyectos/presupuesto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "eliminar", id: g.id }) }).catch(() => null);
    setBorrando(null);
    if (r?.ok) { avisar("Movimiento eliminado."); onChanged(); } else avisar((await r?.json().catch(() => null))?.error ?? "No se pudo eliminar.", "bad");
  };
  if (!b.planeado) return (
    <Card className="p-6 sm:p-8">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold-wash)] text-[var(--gold)]"><Wallet size={20} /></span>
      <h3 className="mt-4 text-[18px] font-extrabold text-ink">Este proyecto no tiene presupuesto planeado</h3>
      <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-ink-soft">Define el presupuesto planeado en la ficha de la iniciativa. Después se registran aquí los compromisos y las ejecuciones, y se comparan con el avance del plan de trabajo.</p>
    </Card>
  );
  const cifras: [string, string, string?][] = [
    ["Planeado", dinero(b.planeado, b.moneda)], ["Comprometido", dinero(b.comprometido, b.moneda), `${f0(b.pctComprometido ?? 0)} %`], ["Ejecutado", dinero(b.ejecutado, b.moneda), `${f0(b.pctEjecutado ?? 0)} %`],
    ["Disponible", dinero(b.disponible, b.moneda), b.disponible < 0 ? "por encima de lo planeado" : undefined],
  ];
  return (
    <>
      <Card className="rise overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4"><div><div className="label">Presupuesto del proyecto</div><p className="mt-1 text-[13.5px]"><Lectura p={b} avance={p.avance} /></p></div><ChipEstado p={b} /></div>
        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {cifras.map(([l, v, pie]) => <div key={l} className="bg-surface px-5 py-4"><div className="label">{l}</div><div className="num mt-1.5 text-[18px] font-extrabold leading-tight text-ink" style={l === "Disponible" && b.disponible < 0 ? { color: "var(--bad)" } : undefined}>{v}</div>{pie && <div className="num mt-1 text-[12px] text-muted">{pie}</div>}</div>)}
        </div>
        <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div>
            <div className="label mb-3">Ejecutado frente al avance del trabajo</div>
            <BarraPresupuesto p={b} avance={p.avance} alto={14} />
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink-soft">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-full bg-navy" />Ejecutado {f0(b.pctEjecutado ?? 0)} %</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-full" style={{ background: "color-mix(in srgb, var(--navy) 28%, var(--surface-3))" }} />Comprometido {f0(b.pctComprometido ?? 0)} %</span>
              <span className="flex items-center gap-1.5"><i className="h-3.5 w-[3px] rounded bg-[var(--gold-fill)]" />{p.avance === null ? "Sin plan de trabajo" : `Avance del trabajo ${f0(p.avance)} %`}</span>
            </div>
            {(b.apertura.ejecutado > 0 || b.apertura.comprometido > 0) && <p className="mt-3 text-[12px] text-faint">Incluye el saldo de apertura de la ficha: {dinero(b.apertura.ejecutado, b.moneda)} ejecutados y {dinero(b.apertura.comprometido, b.moneda)} comprometidos.</p>}
          </div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-[12.5px]">
            <div><dt className="label">Valor ganado</dt><dd className="num mt-1 text-[15px] font-extrabold text-ink">{b.valorGanado === null ? "—" : dinero(b.valorGanado, b.moneda)}</dd><dd className="text-[12px] text-muted">lo que debería haber costado lo hecho</dd></div>
            <div><dt className="label">Índice de costo</dt><dd className="num mt-1 text-[15px] font-extrabold" style={{ color: b.indiceCosto === null ? "var(--faint)" : b.indiceCosto < 0.9 ? "var(--bad)" : b.indiceCosto > 1.1 ? "var(--ok)" : "var(--ink)" }}>{b.indiceCosto === null ? "—" : f2(b.indiceCosto)}</dd><dd className="text-[12px] text-muted">{b.indiceCosto === null ? "requiere avance y ejecución" : b.indiceCosto < 1 ? "cada peso rinde menos de lo planeado" : "cada peso rinde lo planeado o más"}</dd></div>
            <div className="col-span-2"><dt className="label">Proyección al cierre</dt><dd className="num mt-1 text-[15px] font-extrabold text-ink">{b.proyeccion === null ? "—" : dinero(b.proyeccion, b.moneda)}{b.sobrecosto !== null && b.proyeccion !== null && <span className="ml-2 text-[12.5px] font-bold" style={{ color: b.sobrecosto > 0 ? "var(--bad)" : "var(--ok)" }}>{b.sobrecosto > 0 ? "+" : "−"}{dinero(Math.abs(b.sobrecosto), b.moneda)}</span>}</dd><dd className="text-[12px] text-muted">{b.proyeccion === null ? `se calcula desde ${REGLAS_PRESUPUESTO.avanceMinimoProyeccion} % de avance y con ejecución registrada` : "si el dinero sigue rindiendo como hasta ahora"}</dd></div>
          </dl>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title={`Movimientos de presupuesto (${gastos.length})`} sub="compromisos y ejecuciones registrados, del más reciente al más antiguo"
          right={editable && <button type="button" onClick={onNuevo} className="btn-primary btn-sm text-[12px]"><Plus size={13} /> Registrar movimiento</button>} />
        {gastos.length ? (
          <ul className="divide-y divide-line">{gastos.map((g) => (
            <li key={g.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-3">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><span className="text-[13.5px] font-semibold text-ink">{g.concepto}</span><span className={`chip !py-0 text-[11px] ${g.tipo === "EJECUCION" ? "chip-cyan" : ""}`}>{gastoTipoLabel(g.tipo)}</span></div>
                <div className="text-[12px] text-muted">{dia(g.fecha)}{g.soporte ? ` · ${g.soporte}` : ""} · {g.by}</div></div>
              <span className="num text-[14px] font-extrabold text-ink">{dinero(g.monto, b.moneda)}</span>
              {editable ? <button type="button" onClick={() => void eliminar(g)} disabled={borrando === g.id} className="rounded-md p-1.5 text-faint hover:bg-surface-2 hover:text-bad" title="Eliminar el movimiento" aria-label={`Eliminar el movimiento ${g.concepto}`}>{borrando === g.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}</button> : <span />}
            </li>
          ))}</ul>
        ) : <div className="px-5 py-6"><EmptyNote>Aún no hay movimientos registrados en este proyecto. Anota cada compromiso (lo contratado) y cada ejecución (lo pagado) para compararlos con el avance.</EmptyNote></div>}
      </Card>
    </>
  );
}

function GastoForm({ p, hoy, onClose, onDone }: { p: PulsoProyecto; hoy: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ tipo: "EJECUCION" as GastoTipo, concepto: "", monto: "", fecha: hoy, soporte: "" });
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const b = p.presupuesto, monto = leerMonto(f.monto);
  const datos = { iniId: p.iniId, tipo: f.tipo, concepto: f.concepto, monto, fecha: f.fecha, soporte: f.soporte || undefined };
  const invalido = gastoError(datos);
  const despues = f.tipo === "EJECUCION" ? b.ejecutado + monto : b.comprometido + monto;
  const guardar = async () => {
    setBusy(true); setError(null);
    const r = await fetch("/api/td/proyectos/presupuesto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "registrar", movimiento: datos }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(false);
    if (!r?.ok) { setError(j?.error ?? "No se pudo guardar."); return; }
    avisar("Movimiento registrado."); onDone();
  };
  return (
    <Modal title="Registrar movimiento de presupuesto" sub={p.name} onClose={onClose}
      footer={<><button type="button" onClick={onClose} className="btn-ghost !py-2 text-[12px]">Cancelar</button>
        <button type="button" onClick={() => void guardar()} disabled={busy || !!invalido} className="btn-primary !py-2 text-[12.5px] disabled:opacity-40">{busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Registrar</button></>}>
      <div className="space-y-3">
        <Field label="Tipo">
          <div className="grid gap-1.5 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de movimiento">{GASTO_TIPOS.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={f.tipo === t.id} onClick={() => setF({ ...f, tipo: t.id })} className={`rounded-xl px-3 py-2 text-left transition-colors ${f.tipo === t.id ? "bg-navy text-white" : "bg-surface-2/70 text-ink-soft hover:bg-surface-2"}`}>
              <span className="block text-[12.5px] font-bold">{t.label}</span><span className={`block text-[11.5px] leading-snug ${f.tipo === t.id ? "text-white/75" : "text-faint"}`}>{t.desc}</span></button>
          ))}</div>
        </Field>
        <Field label="Concepto"><input value={f.concepto} onChange={(e) => setF({ ...f, concepto: e.target.value })} maxLength={200} placeholder="Qué se contrató o se pagó" className={INPUT} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Monto (${b.moneda})`}><input value={f.monto} onChange={(e) => setF({ ...f, monto: formatoMiles(e.target.value) })} inputMode="decimal" placeholder={b.moneda === "USD" ? "p. ej. 12.500" : "p. ej. 12.000.000"} className={`${INPUT} num`} /></Field>
          <Field label="Fecha"><input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className={`${INPUT} num`} /></Field>
        </div>
        <Field label="Soporte (opcional)"><input value={f.soporte} onChange={(e) => setF({ ...f, soporte: e.target.value })} maxLength={200} placeholder="Factura, contrato u orden de compra" className={INPUT} /></Field>
        {monto > 0 && (
          <div className="rounded-xl px-3.5 py-2.5 text-[12.5px] leading-snug text-ink-soft" style={{ background: tinte(despues > b.planeado ? "var(--bad)" : "var(--navy)", 8) }}>
            Con este movimiento, lo {f.tipo === "EJECUCION" ? "ejecutado" : "comprometido"} queda en <b className="num text-ink">{dinero(despues, b.moneda)}</b>, el {f0((despues / b.planeado) * 100)} % de lo planeado{despues > b.planeado ? ": supera el presupuesto del proyecto." : "."}
          </div>
        )}
        {(error || (invalido && f.concepto.trim().length >= 3 && monto > 0)) && <p className="rounded-lg px-3 py-2 text-[12.5px]" style={{ background: tinte("var(--bad)", 10), color: "var(--bad)" }}>{error ?? invalido}</p>}
        <p className="text-[12px] text-faint">Un movimiento no se edita: si hubo un error, se elimina y se registra de nuevo. Queda en la auditoría con tu nombre.</p>
      </div>
    </Modal>
  );
}

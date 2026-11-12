"use client";

// Portada en modo acompañamiento cuando el módulo Proyectos está habilitado y hay ejecución que leer: la
// confianza de entrega del portafolio, el avance frente a lo esperado, cómo van los resultados clave, el
// presupuesto, los riesgos y los proyectos que requieren atención. La lectura es la misma del tablero de
// impacto (GET /api/td/proyectos/impacto); aquí solo se resume y se enlaza.

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { NIVEL, REGLAS, type Nivel } from "@/lib/impacto-kr";
import { riesgoVivo, severidad } from "@/lib/riesgos";
import { dineroCorto, totalesPorMoneda } from "@/lib/presupuesto";
import type { ImpactoData } from "@/app/panel/proyectos/[[...slug]]/impacto";

/** Lectura de ejecución de la empresa; nula mientras carga, si el módulo no aplica o si ningún proyecto tiene plan. */
export function useEjecucion(activo: boolean): ImpactoData | null {
  const [data, setData] = useState<ImpactoData | null>(null);
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    fetch("/api/td/proyectos/impacto", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (vivo) setData(j); }).catch(() => { /* la portada sigue con lo demás */ });
    return () => { vivo = false; };
  }, [activo]);
  return activo && data && data.proyectos.some((p) => p.confianza !== null) ? data : null;
}

const f0 = (n: number) => Math.round(n).toLocaleString("es-CO");
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const diaCorto = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${Number(d)} ${MES[Number(m) - 1]} ${y.slice(2)}`; };
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const NIVELES: Nivel[] = ["A_FAVOR", "EN_OBSERVACION", "EN_CONTRA", "SIN_SENAL"];

export function EjecucionHome({ data, base, enCurso, total }: { data: ImpactoData; base: string; enCurso: number; total: number }) {
  const conSenal = data.proyectos.filter((p) => p.confianza !== null), conPlan = data.proyectos.filter((p) => p.avance !== null);
  const confianza = media(conSenal.map((p) => p.confianza!)) ?? 0, avance = media(conPlan.map((p) => p.avance!)) ?? 0, esperado = media(conPlan.map((p) => p.esperado!)) ?? 0;
  const nivel: Nivel = confianza >= REGLAS.niveles.aFavor ? "A_FAVOR" : confianza >= REGLAS.niveles.enObservacion ? "EN_OBSERVACION" : "EN_CONTRA";
  const porNivel = (n: Nivel) => data.krs.filter((k) => k.nivel === n).length;
  const frenados = data.krs.filter((k) => k.nivel === "EN_CONTRA" || k.nivel === "EN_OBSERVACION").slice(0, 4);
  const vivos = data.riesgos.filter(riesgoVivo), altos = vivos.filter((r) => severidad(r) >= 15).length, materializados = vivos.filter((r) => r.status === "MATERIALIZADO").length;
  const dinero = totalesPorMoneda(data.proyectos.map((p) => p.presupuesto))[0];
  const enAlerta = data.proyectos.filter((p) => p.presupuesto.estado === "ALERTA" || p.presupuesto.estado === "SOBRECOSTO").length;
  const atencion = conSenal.filter((p) => p.nivel !== "A_FAVOR").sort((a, b) => a.confianza! - b.confianza!);
  const dif = avance - esperado;
  return (
    <>
      <div className="rise rise-1 panel relative mb-5 overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(560px 240px at 12% 0%, rgb(14 147 180 / 0.06), transparent 60%)" }} />
        <div className="relative grid gap-8 px-6 py-6 sm:px-7 lg:grid-cols-[210px_minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <div>
            <div className="label mb-2">Confianza de entrega</div>
            <div className="flex items-baseline gap-2"><span className="num text-[58px] font-extrabold leading-none" style={{ color: NIVEL[nivel].color }}>{f0(confianza)}</span><span className="text-[13px] text-muted">de 100</span></div>
            <div className="mt-2"><span className={`chip ${NIVEL[nivel].chip}`}>{NIVEL[nivel].label}</span></div>
            <p className="mt-2 text-[12px] leading-snug text-muted">Promedio de {conSenal.length} {conSenal.length === 1 ? "proyecto" : "proyectos"} con plan de trabajo, al {diaCorto(data.hoy)}.</p>
          </div>

          <div className="min-w-0 space-y-5">
            <div>
              <div className="label mb-2">Avance del plan de trabajo</div>
              <div className="flex items-baseline gap-2"><span className="num text-[26px] font-extrabold text-ink">{f0(avance)} %</span><span className="text-[12.5px] text-muted">ejecutado · {f0(esperado)} % esperado a la fecha</span></div>
              <div className="relative mt-2 h-[9px] rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-navy" style={{ width: `${Math.min(100, avance)}%` }} />
                <div className="absolute -top-[3px] h-[15px] w-[2px] rounded bg-ink" style={{ left: `${Math.min(100, esperado)}%` }} title={`Esperado a la fecha: ${f0(esperado)} %`} />
              </div>
              <p className="mt-1.5 text-[12px]" style={{ color: Math.abs(dif) < REGLAS.ritmo.tolerancia ? "var(--muted)" : dif < 0 ? "var(--bad-text)" : "var(--ok-text)" }}>
                {Math.abs(dif) < REGLAS.ritmo.tolerancia ? "Al ritmo del plan" : dif < 0 ? `${f0(-dif)} puntos por debajo del plan` : `${f0(dif)} puntos por encima del plan`}
              </p>
            </div>
            <div>
              <div className="label mb-2">Resultados clave que mueven los proyectos · {data.krs.length}</div>
              <div className="flex h-[9px] overflow-hidden rounded-full bg-surface-2">
                {NIVELES.filter((n) => porNivel(n)).map((n) => <div key={n} style={{ width: `${(porNivel(n) / data.krs.length) * 100}%`, background: NIVEL[n].color }} title={`${porNivel(n)} ${NIVEL[n].label.toLowerCase()}`} />)}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
                {NIVELES.filter((n) => porNivel(n)).map((n) => <span key={n} className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: NIVEL[n].color }} /><b className="num text-ink">{porNivel(n)}</b> {NIVEL[n].label.toLowerCase()}</span>)}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="label mb-2">Resultados clave que la ejecución frena</div>
            {frenados.length ? (
              <ul className="space-y-2.5">
                {frenados.map((k) => (
                  <li key={k.code} className="flex items-start gap-2.5">
                    <i className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ background: NIVEL[k.nivel].color }} />
                    <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold text-ink" title={k.name}>{k.name}</div><div className="text-[12px] leading-snug text-muted">{k.factores[0] ? k.factores[0].titulo : NIVEL[k.nivel].label}{k.proyectos[0] ? ` · ${k.proyectos[0].name}` : ""}</div></div>
                    <span className="num shrink-0 text-[13px] font-extrabold" style={{ color: NIVEL[k.nivel].color }}>{k.confianza === null ? "—" : f0(k.confianza)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[13px] text-muted">La ejecución empuja todos los resultados clave que tienen proyecto.</p>}
            <Link href={`${base}/panel/proyectos`} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-cyan-deep hover:underline">Abrir el tablero de impacto <ArrowRight size={13} /></Link>
          </div>
        </div>
      </div>

      <div className="rise rise-2 mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Iniciativas en ejecución" value={enCurso} unit={`de ${total}`} foot={`${conPlan.length} con plan de trabajo · ${data.proyectos.reduce((a, p) => a + p.tareas.total, 0)} tareas`} />
        <StatCard label="Presupuesto ejecutado" value={dinero?.pctEjecutado ?? 0} unit="%" accent="linear-gradient(90deg, var(--n4), var(--n5))"
          foot={dinero ? `${dineroCorto(dinero.ejecutado, dinero.moneda)} de ${dineroCorto(dinero.planeado, dinero.moneda)}${enAlerta ? ` · ${enAlerta} ${enAlerta === 1 ? "proyecto" : "proyectos"} en alerta` : ""}` : "Sin presupuesto planeado"} />
        <StatCard label="Riesgos abiertos" value={vivos.length} unit={`· ${altos} de nivel alto`} accent="linear-gradient(90deg, var(--bad), #a13c44)"
          foot={vivos.length ? `${materializados} ${materializados === 1 ? "materializado" : "materializados"} · ${data.riesgos.length - vivos.length} ${data.riesgos.length - vivos.length === 1 ? "cerrado" : "cerrados"}` : "Ninguno registrado"} />
      </div>

      <Card className="rise rise-3 mb-8 overflow-hidden">
        <CardHeader title="Proyectos que requieren atención" sub="de menor a mayor confianza de entrega, con la señal que más pesa en cada uno" />
        {atencion.length === 0 && <div className="px-5 py-4 text-[12.5px] italic text-faint">Todos los proyectos con plan van a favor.</div>}
        <div className="grid gap-x-6 px-4 pb-4 lg:grid-cols-2">
          {atencion.slice(0, 8).map((p) => (
            <Link key={p.iniId} href={`${base}/panel/proyectos/${p.iniId}`} className="group flex min-w-0 items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-surface-2">
              <i className="mt-[6px] h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: NIVEL[p.nivel].color }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-ink">{p.name}</div>
                <div className="text-[12px] leading-snug text-muted">{p.factores[0] ? `${p.factores[0].titulo}. ${p.factores[0].detalle}` : NIVEL[p.nivel].desc}</div>
                <div className="num mt-0.5 text-[11px] text-faint">{data.responsables[p.ownerId] ?? p.ownerId} · avance {f0(p.avance ?? 0)} % de {f0(p.esperado ?? 0)} % esperado</div>
              </div>
              <span className="num shrink-0 text-[15px] font-extrabold" style={{ color: NIVEL[p.nivel].color }}>{f0(p.confianza!)}</span>
              <ArrowRight size={14} className="mt-1 shrink-0 text-faint transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}

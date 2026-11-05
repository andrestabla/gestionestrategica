"use client";

// Mercado farmacéutico colombiano según IQVIA y Close-Up: lectura interna de Siegfried (octubre de 2026) transcrita
// a la plataforma. Segmentos, clases terapéuticas, proyección retail vs institucional, retail por categoría y canal,
// especialidades, ranking de corporaciones, mercado de prescripción, cambios estructurales y agenda 2026-2030.

import { Card, CardHeader, StatCard } from "@/components/ui";
import { MERCADO_FARMA_CO as M } from "@/data/mercado-farma-co";
import { TrendingUp, Store, Users, Lightbulb, Shield, Target, Cpu } from "lucide-react";

const n = (x: number, d = 1) => x.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (x: number | null, d = 1) => (x == null ? "—" : `${x > 0 ? "+" : ""}${n(x, d)} %`);
const Crec = ({ v, d = 1 }: { v: number | null; d?: number }) => <span className={`num font-bold ${v == null ? "text-faint" : v < 0 ? "text-bad" : "text-ok"}`}>{pct(v, d)}</span>;

export type ParteMercado = "resumen" | "mercado" | "competencia" | "senales";

export function MercadoFarma({ empresa, parte = "mercado" }: { empresa: string; parte?: ParteMercado }) {
  const sv = M.segmentos.valores; const ult = sv[sv.length - 1];
  const esp = M.especialidades; const maxEsp = esp.filas[0].mat26;
  const pr = M.proyeccion; const maxPr = Math.max(...pr.filas.map((f) => f.retail));
  const corp = M.corporaciones; const cu = M.closeUp;
  const esSF = /siegfried/i.test(empresa);
  return (
    <>
      {parte === "resumen" && <Card className="rise rise-1 mb-5">
        <CardHeader title="Mercado farmacéutico colombiano · IQVIA y Close-Up" sub={`${M.titulo} · ${M.autor} · ${M.fecha} · cortes MAT marzo a agosto de 2026`} />
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Mercado IQVIA (valores)" value={esp.totalMat26 / 1e12} decimals={2} prefix="$ " unit="billones COP" foot={`${M.especialidades.corte} · ${pct(esp.crecTotal, 2)} frente a MAT ago-25`} />
          <StatCard label="Institucional · comercial" value={ult.institucional} unit="% inst." foot={`${ult.comercial} % comercial en valores · ${M.segmentos.corte}`} accent="linear-gradient(90deg, var(--navy), var(--cyan-deep))" />
          <StatCard label="CAGR retail 2025-2030" value={pr.cagr.retail} decimals={1} unit="%" foot={`institucional ${n(pr.cagr.institucional)} % · total ${n(pr.cagr.total)} %`} accent="linear-gradient(90deg, var(--cyan), var(--cyan-deep))" />
          <StatCard label={`${esSF ? "Siegfried" : "Siegfried Corp."} en corporaciones`} value={corp.siegfried.ms} decimals={2} unit="% MS" foot={`${corp.siegfried.rank}.º del ranking · ${pct(corp.siegfried.crec, 2)} MAT frente a mercado ${pct(corp.mercado.crec2026, 2)} · IE ${corp.siegfried.ie}`} accent="linear-gradient(90deg, var(--gold), #a87d1e)" />
        </div>
        <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">{M.titulo} · {M.fuentes.join(" y ")}. El detalle está en las pestañas Mercado, Competencia y Señales.</p>
      </Card>}

      {parte === "mercado" && (<>
      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        {/* segmentos */}
        <Card className="rise rise-1 overflow-hidden">
          <CardHeader title="Institucional pierde puntos; el comercial recupera" sub={`evolución por segmento · ${M.segmentos.corte} · ${M.segmentos.fuente}`} />
          <div className="grid gap-5 px-5 pb-4 sm:grid-cols-2">
            {[["Ventas en valores", "miles de millones COP", M.segmentos.valores], ["Ventas en volumen", "miles de millones de unidades", M.segmentos.volumen]].map(([t, u, rows]) => (
              <div key={t as string}>
                <div className="text-[12px] font-bold text-ink">{t as string} <span className="font-normal text-faint">· {u as string}</span></div>
                <div className="mt-2 flex items-end gap-2">
                  {(rows as typeof M.segmentos.valores).map((r) => { const h = (r.total / (rows as typeof M.segmentos.valores)[(rows as typeof M.segmentos.valores).length - 1].total) * 120; return (
                    <div key={r.mat} className="flex min-w-0 flex-1 flex-col items-center text-[11px]">
                      <span className="num mb-1 text-faint">{r.crec == null ? "" : pct(r.crec, 1)}</span>
                      <span className="num font-bold text-ink">{r.total.toLocaleString("es-CO")}</span>
                      <div className="mt-1 flex w-full flex-col overflow-hidden rounded-md" style={{ height: h }}>
                        <div style={{ height: `${r.comercial}%`, background: "var(--cyan-deep)" }} title={`comercial ${r.comercial} %`} />
                        <div style={{ height: `${r.institucional}%`, background: "var(--navy)" }} title={`institucional ${r.institucional} %`} />
                      </div>
                      <span className="num mt-1 text-faint">{r.comercial}/{r.institucional}</span>
                      <span className="text-faint">MAT jun {r.mat}</span>
                    </div>
                  ); })}
                </div>
              </div>
            ))}
          </div>
          <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">{M.segmentos.lectura} <span className="text-faint">Barras: comercial (claro) / institucional (oscuro).</span></p>
        </Card>

        {/* proyección */}
        <Card className="rise rise-2 overflow-hidden">
          <CardHeader title="Retail mantendrá una ventaja estructural de crecimiento" sub={`crecimiento proyectado retail e institucional · ${pr.unidad} · ${pr.fuente}`} />
          <div className="px-5 pb-4">
            <div className="flex items-end gap-3">
              {pr.filas.map((f) => (
                <div key={f.anio} className="flex min-w-0 flex-1 flex-col items-center text-[11px]">
                  <div className="flex w-full items-end justify-center gap-1" style={{ height: 120 }}>
                    <div className="w-1/2 rounded-t-md" style={{ height: `${(f.retail / maxPr) * 100}%`, background: "var(--cyan-deep)" }} title={`retail ${f.retail} %`} />
                    <div className="w-1/2 rounded-t-md" style={{ height: `${(f.institucional / maxPr) * 100}%`, background: "var(--navy)" }} title={`institucional ${f.institucional} %`} />
                  </div>
                  <span className="num mt-1 font-bold text-ink">{n(f.retail)} · {n(f.institucional)}</span>
                  <span className="num text-faint">total {n(f.total)} %</span>
                  <span className="text-faint">{f.anio}</span>
                </div>
              ))}
              <div className="flex min-w-0 flex-1 flex-col items-center rounded-xl border border-dashed border-line-strong px-2 py-2 text-[11px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-faint">CAGR {pr.cagr.periodo}</span>
                <span className="num text-[18px] font-extrabold text-cyan-deep">{n(pr.cagr.retail)} %</span><span className="text-faint">retail</span>
                <span className="num mt-1 text-[14px] font-extrabold text-ink">{n(pr.cagr.institucional)} %</span><span className="text-faint">institucional</span>
                <span className="num mt-1 text-faint">total {n(pr.cagr.total)} %</span>
              </div>
            </div>
          </div>
          <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">{pr.lectura} Retail 2026: +{M.proyeccion.filas[1].retail} % frente a +{M.proyeccion.filas[1].institucional} % institucional.</p>
        </Card>
      </div>

      {/* rutas de acceso */}
      <Card className="rise rise-2 mb-5">
        <CardHeader title="El paciente activa nuevas rutas de acceso" sub="mientras el segmento institucional se reorganiza · IQVIA" />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
          {M.rutas.map((r) => (
            <div key={r.n} className="rounded-xl bg-surface-2/60 px-4 py-3">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-cyan-deep"><span className="num">{r.n}</span> {r.t}</div>
              <p className="mt-1.5 text-[12.5px] leading-snug text-ink">{r.d}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        {/* top 11 */}
        <Card className="rise rise-2 overflow-hidden">
          <CardHeader title="Obesidad, bienestar y autocuidado ganan protagonismo" sub={`top 11 clases terapéuticas · participación retail / institucional en valores · ${M.top11.corte} · ${M.top11.fuente}`} />
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-4 py-2">Clase</th><th className="px-2 py-2">Retail / inst. 2026</th><th className="num px-2 py-2 text-right">2025 retail</th><th className="num px-2 py-2 text-right">Crec. retail</th><th className="num px-2 py-2 text-right">Inst.</th><th className="num px-2 py-2 text-right">Total</th></tr></thead>
              <tbody>
                {M.top11.filas.map((f) => (
                  <tr key={f.clase} className="border-t border-line">
                    <td className="px-4 py-1.5 font-semibold text-ink">{f.clase}</td>
                    <td className="px-2 py-1.5"><div className="flex h-[9px] w-[120px] overflow-hidden rounded-full bg-surface-2" title={`retail ${f.retail26} % · institucional ${f.inst26} %`}><div style={{ width: `${f.retail26}%`, background: "var(--cyan-deep)" }} /><div style={{ width: `${f.inst26}%`, background: "var(--navy)" }} /></div><span className="num text-[11px] text-faint">{n(f.retail26)} % retail</span></td>
                    <td className="num px-2 py-1.5 text-right text-muted">{n(f.retail25)} %</td>
                    <td className="px-2 py-1.5 text-right"><Crec v={f.crecRetail} /></td>
                    <td className="px-2 py-1.5 text-right"><Crec v={f.crecInst} /></td>
                    <td className="px-2 py-1.5 text-right"><Crec v={f.crecTotal} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">{M.top11.lectura}</p>
        </Card>

        {/* especialidades */}
        <Card className="rise rise-3 overflow-hidden">
          <CardHeader title="Cardiometabolismo, dermatología y gastroenterología lideran" sub={`ventas por especialidad · ${esp.corte} · ${esp.fuente} · billones de COP`} />
          <ul className="space-y-1.5 px-5 pb-4">
            {esp.filas.map((f) => (
              <li key={f.esp} className="grid grid-cols-[150px_1fr_64px_72px] items-center gap-2 text-[12px]">
                <span className="truncate font-semibold text-ink" title={f.esp}>{f.esp}</span>
                <div className="h-[10px] overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${(f.mat26 / maxEsp) * 100}%`, background: "var(--cyan-deep)" }} /></div>
                <span className="num text-right text-ink">{n(f.mat26 / 1e12, 2)}</span>
                <span className="text-right"><Crec v={f.crec} d={1} /></span>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">{esp.lectura} Mercado total {n(esp.totalMat26 / 1e12, 2)} billones (MAT ago-26) frente a {n(esp.totalMat25 / 1e12, 2)} (MAT ago-25): {pct(esp.crecTotal, 2)}.</p>
        </Card>
      </div>

      {/* retail por categoría y canal */}
      <Card className="rise rise-3 mb-5 overflow-hidden">
        <CardHeader title="El mercado ético mantiene su liderazgo en el retail" sub={`categorías y canales en valores · ${M.retail.corte} · ${M.retail.fuente}`} />
        <div className="grid gap-5 px-5 pb-4 lg:grid-cols-3">
          <div>
            <div className="text-[12px] font-bold text-ink">Matriz de crecimientos <span className="font-normal text-faint">· valor y volumen</span></div>
            <ul className="mt-2 space-y-1">
              {[...M.retail.matriz].sort((a, b) => b.crecValor - a.crecValor).map((c) => (
                <li key={c.cat} className="flex items-center justify-between gap-2 text-[12px]"><span className="text-ink">{c.cat}</span><span className="num text-faint">valor <Crec v={c.crecValor} d={1} /> · vol. <Crec v={c.crecVolumen} d={1} /></span></li>
              ))}
            </ul>
          </div>
          {[["Farmacias de cadenas", M.retail.cadenas, M.retail.participacionCanales.cadenas], ["Independientes", M.retail.independientes, M.retail.participacionCanales.independientes]].map(([t, rows, share]) => (
            <div key={t as string}>
              <div className="text-[12px] font-bold text-ink">{t as string} <span className="num font-normal text-faint">· {share as number} % del canal</span></div>
              <table className="mt-2 w-full text-[12px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="py-1">MAT</th><th className="num py-1 text-right">Ventas</th><th className="num py-1 text-right">Ético</th><th className="num py-1 text-right">OTC</th><th className="num py-1 text-right">C. pers.</th><th className="num py-1 text-right">Crec.</th></tr></thead>
                <tbody>{(rows as typeof M.retail.cadenas).map((r) => <tr key={r.mat} className="border-t border-line"><td className="py-1 text-ink">jul-{r.mat.slice(2)}</td><td className="num py-1 text-right font-bold text-ink">{n(r.ventas)} bn</td><td className="num py-1 text-right">{n(r.etico)} %</td><td className="num py-1 text-right">{n(r.otc)} %</td><td className="num py-1 text-right">{n(r.cuidadoPersonal)} %</td><td className="py-1 text-right"><Crec v={r.crec} /></td></tr>)}</tbody>
              </table>
            </div>
          ))}
        </div>
        <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">{M.retail.lectura}</p>
      </Card>
      </>)}

      {parte === "competencia" && (
      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        {/* ranking corporaciones */}
        <Card className="rise rise-3 overflow-hidden">
          <CardHeader title="Ranking de corporaciones" sub={`${corp.corte} · ${corp.fuente} · MAT en ${corp.unidad} y crecimientos MAT por año`} />
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-4 py-2">#</th><th className="px-2 py-2">Corporación</th><th className="num px-2 py-2 text-right">MAT</th><th className="num px-2 py-2 text-right">2023</th><th className="num px-2 py-2 text-right">2024</th><th className="num px-2 py-2 text-right">2025</th><th className="num px-2 py-2 text-right">2026</th></tr></thead>
              <tbody>
                {corp.filas.map((f) => { const self = f.corp === "Siegfried"; return (
                  <tr key={f.rank} className={`border-t border-line ${self ? "bg-gold-wash/50 font-bold" : ""}`}>
                    <td className="num px-4 py-1.5 text-faint">{f.rank}</td><td className="px-2 py-1.5 text-ink">{f.corp}{self ? " Corp." : ""}</td>
                    <td className="num px-2 py-1.5 text-right text-ink">{f.mat.toLocaleString("es-CO")}</td>
                    <td className="px-2 py-1.5 text-right"><Crec v={f.c23} d={2} /></td><td className="px-2 py-1.5 text-right"><Crec v={f.c24} d={2} /></td><td className="px-2 py-1.5 text-right"><Crec v={f.c25} d={2} /></td><td className="px-2 py-1.5 text-right"><Crec v={f.c26} d={2} /></td>
                  </tr>
                ); })}
                <tr className="border-t-2 border-line-strong font-bold"><td className="px-4 py-1.5" /><td className="px-2 py-1.5 text-ink">Mercado total</td><td className="num px-2 py-1.5 text-right text-ink">{corp.mercado.mat.toLocaleString("es-CO")}</td><td className="px-2 py-1.5 text-right"><Crec v={corp.mercado.crec2023} d={2} /></td><td className="px-2 py-1.5 text-right"><Crec v={corp.mercado.crec2024} d={2} /></td><td className="px-2 py-1.5 text-right"><Crec v={corp.mercado.crec2025} d={2} /></td><td className="px-2 py-1.5 text-right"><Crec v={corp.mercado.crec2026} d={2} /></td></tr>
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">{corp.lectura}</p>
        </Card>

        {/* close-up */}
        <Card className="rise rise-4 overflow-hidden">
          <CardHeader title="Mercado de prescripción (Close-Up)" sub={`${cu.corte} · ${cu.fuente} · MAT en ${cu.unidad} · mercado ${pct(cu.mercadoCrec, 2)}`} />
          <div className="grid gap-3 px-5 pb-3 sm:grid-cols-4">
            {[["Participación", `${n(cu.siegfried.ms, 2)} %`], ["Crecimiento MAT", pct(cu.siegfried.crec, 2)], ["Índice de evolución", String(cu.siegfried.ie)], ["Posición", `#${cu.siegfried.rank} · #${cu.siegfried.rankIdentificadas} identificadas`]].map(([a, b]) => (
              <div key={a} className="rounded-xl bg-surface-2/60 px-3 py-2"><div className="text-[11px] font-bold uppercase tracking-wider text-faint">{a}</div><div className="num text-[16px] font-extrabold text-ink">{b}</div></div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-4 py-2">#</th><th className="px-2 py-2">Corporación</th><th className="num px-2 py-2 text-right">MAT</th><th className="num px-2 py-2 text-right">MS</th><th className="num px-2 py-2 text-right">Crec.</th><th className="num px-2 py-2 text-right">IE</th></tr></thead>
              <tbody>
                {cu.filas.map((f) => { const self = f.corp === "Siegfried"; return (
                  <tr key={f.rank} className={`border-t border-line ${self ? "bg-gold-wash/50 font-bold" : ""}`}>
                    <td className="num px-4 py-1.5 text-faint">{f.rank}</td><td className="px-2 py-1.5 text-ink">{f.corp}{self ? " Corp." : ""}</td>
                    <td className="num px-2 py-1.5 text-right text-ink">{f.mat.toLocaleString("es-CO")}</td><td className="num px-2 py-1.5 text-right">{n(f.ms, 2)} %</td><td className="px-2 py-1.5 text-right"><Crec v={f.crec} d={2} /></td><td className={`num px-2 py-1.5 text-right ${f.ie >= 100 ? "text-ok" : "text-bad"}`}>{f.ie}</td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">{cu.lectura}</p>
        </Card>
      </div>
      )}

      {/* cambios y agenda */}
      {parte === "senales" && (
      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Card className="rise rise-4">
          <CardHeader title="Varios cambios simultáneos redefinen el mercado" sub="cambio e implicación para los laboratorios" />
          <div className="space-y-2 px-5 pb-5">
            {M.cambios.map((c) => { const I = c.cat === "Crecimiento" ? TrendingUp : c.cat === "Paciente" ? Users : c.cat === "Farmacias" ? Store : Lightbulb; return (
              <div key={c.cat} className="grid gap-2 rounded-xl bg-surface-2/60 px-4 py-3 sm:grid-cols-[120px_1fr_1fr]">
                <div className="flex items-center gap-2 text-[12px] font-bold text-cyan-deep"><I size={14} /> {c.cat}</div>
                <p className="text-[12.5px] leading-snug text-ink">{c.cambio}</p>
                <p className="text-[12.5px] leading-snug text-muted"><b className="text-ink-soft">Implicación:</b> {c.implicacion}</p>
              </div>
            ); })}
          </div>
        </Card>
        <Card className="rise rise-4">
          <CardHeader title="Agenda 2026-2030: gestionar el ecosistema de acceso, no solo el producto" sub={M.agenda.lectura} />
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
            {[["01 · Qué proteger", Shield, M.agenda.proteger], ["02 · Dónde crecer", Target, M.agenda.crecer], ["03 · Qué capacidades construir", Cpu, M.agenda.capacidades]].map(([t, I, items]) => { const Icon = I as typeof Shield; return (
              <div key={t as string} className="rounded-xl bg-surface-2/60 px-4 py-3">
                <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-cyan-deep"><Icon size={13} /> {t as string}</div>
                <ul className="mt-2 space-y-1.5">{(items as readonly string[]).map((x) => <li key={x} className="flex gap-2 text-[12.5px] leading-snug text-ink"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-deep" />{x}</li>)}</ul>
              </div>
            ); })}
          </div>
        </Card>
      </div>
      )}
    </>
  );
}
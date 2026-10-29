"use client";

// Panel principal: héroe con gauge de la empresa, avance por capacidad,
// feed de atención y módulos.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isConvencion, isAcompanamiento, horizonsOf, leversOf } from "@/data/catalogo";
import { vocabOf } from "@/lib/vocabulario";
import { DIMS, PRACTICES } from "@/data/mapa";
import { PERSPECTIVES } from "@/data/cmi";
import { PageHeader, Card, CardHeader, StatCard, ModuleCard, StateDot } from "@/components/ui";
import { MaturityRadar, ScoreGauge, type ScoresMap } from "@/components/charts";
import { useCatalog } from "@/components/catalog-context";
import { useBase } from "@/components/user-context";
import { LINES, fmtCOP } from "@/data/demo";
import { prevScores } from "@/lib/vista";
import { buildAlerts, executiveSummary } from "@/lib/logic";
import { useMaturity } from "@/lib/use-maturity";
import { ArrowRight, ShieldAlert, AlertTriangle, Info, CheckCircle2, Circle } from "lucide-react";
import { hasInstrument } from "@/lib/instrumentos";

/** «3 objetivos», «1 objetivo»: conteo con su sustantivo. */
const cuenta = (n: number, singular: string, plural = `${singular}s`) => `${n} ${n === 1 ? singular : plural}`;

/** Sin medición publicada ni fuentes capturadas: los gráficos se muestran vacíos en lugar de «1,0 Incipiente». */
const EMPTY_SCORES: ScoresMap = { 1: {}, 2: {}, 3: {}, 4: {} };

const SEV_META = {
  1: { icon: ShieldAlert, color: "var(--bad-text)", label: "Críticas" },
  2: { icon: AlertTriangle, color: "var(--warn-text)", label: "Advertencias" },
  3: { icon: Info, color: "var(--muted)", label: "Informativas" },
} as const;

export default function Panel() {
  const base = useBase();
  const v = useCatalog();
  const router = useRouter();
  const convencion = isConvencion(v.catalog.company);
  // modo convención: el inicio es Dirección
  useEffect(() => { if (convencion) router.replace(`${base}/panel/convencion?t=itinerario`); }, [convencion, base, router]);
  return convencion ? null : <PanelHome />;
}

function PanelHome() {
  const base = useBase();
  const v = useCatalog();
  // medición vigente efectiva (si A3 se publicó desde la plataforma, manda A3)
  const { data: matData, scores: effScores, lineScoreOf, prevLineScoreOf, institution } = useMaturity();
  const score = institution;
  const prevByLine = prevScores(v);
  const prev = matData?.previous
    ? [1, 2, 3, 4].reduce((a, n) => a + (prevLineScoreOf(n) ?? 0), 0) / 4
    : Object.values(prevByLine).reduce((a, b) => a + b, 0) / 4;
  // empresa sin medición publicada (corte A0): nada que calificar ni alertar todavía
  const sinDato = (matData?.current.id ?? v.current.id) === "A0";
  const alerts = sinDato ? [] : buildAlerts(v);
  const summary = executiveSummary(v);
  const initiatives = v.initiatives;
  const budget = initiatives.reduce(
    (a, i) => ({
      planned: a.planned + i.budgetPlanned,
      executed: a.executed + i.budgetExecuted,
    }),
    { planned: 0, executed: 0 },
  );
  const budgetPct = budget.planned ? Math.round((budget.executed / budget.planned) * 100) : 0;
  // etiquetas de los módulos: lo que hay en el catálogo de esta empresa, no cifras fijas
  const horizons = horizonsOf(v.catalog.company);
  const acomp = isAcompanamiento(v.catalog.company);
  const V = vocabOf(v.catalog.company);
  const levers = leversOf(v.catalog.company);
  const roadmap = horizons.length > 1 ? `${horizons[0].label} → ${horizons[horizons.length - 1].label}` : horizons[0].label;
  const serie = summary.maturity.history.map((h) => h.institution.toFixed(2).replace(".", ",")).join(" → ");

  return (
    <>
      <PageHeader
        kicker={v.catalog.company.name}
        title="Estado de la capacidad organizacional"
        desc={`Medición vigente: ${matData?.current.label ?? summary.maturity.assessment.label} (${matData?.current.period ?? summary.maturity.assessment.period}).${serie ? ` Serie de la empresa: ${serie}.` : " Aún no hay mediciones publicadas."}`}
      />

      {sinDato && <ArranqueCard />}

      {/* ── héroe: gauge + avance por línea ── */}
      <div className="rise rise-1 panel relative mb-5 overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(560px 240px at 12% 0%, rgb(14 147 180 / 0.06), transparent 60%)" }} />
        <div className="relative grid gap-8 px-7 py-6 lg:grid-cols-[240px_1fr_320px] lg:items-center">
          <div>
            <div className="label mb-2">Madurez de la empresa</div>
            {sinDato ? (
              <div className="grid h-[130px] place-items-center rounded-2xl border border-dashed border-line text-center">
                <div><div className="num text-[30px] font-extrabold text-faint">—</div><div className="text-[12px] text-muted">Sin medición todavía</div></div>
              </div>
            ) : <ScoreGauge value={score} />}
            {!sinDato && <div className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-muted">
              <span className="chip chip-ok num">{sinDato ? "—" : `▲ ${(score - prev).toFixed(1).replace(".", ",")}`}</span>
              {sinDato ? "sin medición anterior" : "frente a la medición anterior"}
            </div>}
          </div>

          <div className="space-y-4">
            <div className="label">Avance por capacidad</div>
            {LINES.map((l) => {
              const now = sinDato ? 0 : lineScoreOf(l.n);
              const before = sinDato ? 0 : (prevLineScoreOf(l.n) ?? prevByLine[l.n] ?? 0);
              return (
                <Link key={l.n} href={`${base}/panel/diagnostico/capacidad/${l.n}`} className="group block">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[13px] font-bold text-ink transition-colors group-hover:text-cyan-deep">
                      {l.code} <span className="font-semibold text-ink-soft">{l.name}</span>
                    </span>
                    <span className="num text-[12px] text-muted">
                      {sinDato ? <span className="text-faint">sin dato</span> : <>{before.toFixed(1)} → <b className="text-[13px] text-cyan-deep">{now.toFixed(1)}</b></>}
                    </span>
                  </div>
                  <div className="relative h-[9px] overflow-hidden rounded-full bg-surface-2">
                    <div className="absolute inset-y-0 left-0 rounded-full opacity-25"
                      style={{ width: `${(before / 5) * 100}%`, background: l.color }} />
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(now / 5) * 100}%`,
                        background: `linear-gradient(90deg, color-mix(in srgb, ${l.color} 55%, white), ${l.color})`,
                      }} />
                    <div className="absolute top-0 h-full border-l-[1.5px] border-dashed border-gold"
                      style={{ left: `${((now + 2) / 5) * 100}%` }} />
                  </div>
                </Link>
              );
            })}
            <div className="flex items-center gap-4 pt-1 text-[12px] text-faint">
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-[3px] w-4 rounded-full bg-line-strong" /> medición anterior
              </span>
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-0 w-4 border-t-[1.5px] border-dashed border-gold" /> meta 24 m
              </span>
            </div>
          </div>

          <div className="hidden lg:block">
            <MaturityRadar size={320} scores={sinDato ? EMPTY_SCORES : effScores} />
          </div>
        </div>
      </div>

      {/* ── métricas ── */}
      <div className="rise rise-2 mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Iniciativas en ejecución"
          value={initiatives.filter((i) => i.status === "EN_CURSO").length}
          unit={`de ${initiatives.length}`} foot={`Roadmap ${roadmap}`} />
        <StatCard label="Presupuesto ejecutado"
          value={budgetPct} unit="%"
          foot={`${fmtCOP(budget.executed)} de ${fmtCOP(budget.planned)}`}
          accent="linear-gradient(90deg, var(--n4), var(--n5))" />
        <StatCard label="Alertas del motor de seguimiento" value={sinDato ? 0 : summary.alertCounts.critical}
          unit={`críticas · ${sinDato ? 0 : summary.alertCounts.warning} advertencias`}
          foot={`${summary.actions.done}/${summary.actions.total} acciones completadas · ${summary.actions.late} vencidas`}
          accent="linear-gradient(90deg, var(--bad), #a13c44)" />
      </div>

      {/* ── alertas del motor de seguimiento ── */}
      <Card className="rise rise-3 mb-8">
        <CardHeader title="Alertas del motor de seguimiento"
          sub="Generadas por las reglas del marco conceptual: rachas en rojo, KPI contra meta, rezago de captura, proyección insuficiente, desalineación presupuestal y evidencia faltante" />
        {alerts.length === 0 && <div className="px-5 py-4 text-[12.5px] italic text-faint">{sinDato ? "El motor de seguimiento arranca con la primera medición publicada." : "Sin alertas abiertas."}</div>}
        <div className="grid gap-x-6 px-4 pb-4 lg:grid-cols-2">
          {alerts.slice(0, 10).map((al) => {
            const meta = SEV_META[al.severity];
            return (
              <Link key={al.id} href={al.href}
                className="group flex min-w-0 items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-surface-2">
                <meta.icon size={15} className="mt-0.5 shrink-0" style={{ color: meta.color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-ink">{al.title}</div>
                  <div className="text-[12px] leading-snug text-muted">{al.detail}</div>
                  {al.owner && <div className="num mt-0.5 text-[11px] text-faint">{al.owner}</div>}
                </div>
                <ArrowRight size={14} className="mt-0.5 shrink-0 text-faint transition-transform group-hover:translate-x-1" />
              </Link>
            );
          })}
        </div>
        {alerts.length > 10 && (
          <div className="border-t border-line px-5 py-2.5 text-[12px] text-faint">
            {alerts.length - 10} alertas más de menor severidad en los módulos correspondientes.
          </div>
        )}
      </Card>

      {/* ── módulos ── */}
      <div className="rise rise-4">
        <div className="kicker mb-4">Módulos de la plataforma</div>
        {acomp ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ModuleCard href={`${base}/panel/diagnostico`} code="M1" title="Diagnóstico de capacidades"
            desc="Autoevaluación directiva y lectura de las capacidades: perfil, dimensiones y qué mirar primero."
            tags={[cuenta(DIMS.length, "dimensión", "dimensiones")]} />
          <ModuleCard href={`${base}/panel/convencion?t=prioridades`} code="PE" title={V.tabs.prioridades}
            desc="Las prioridades 3 a 5 años con su sponsor, su indicador y su descripción: ordenan todo lo demás."
            tags={[cuenta(levers.length, "prioridad", "prioridades")]} />
          <ModuleCard href={`${base}/panel/convencion?t=direccion`} code="OD" title={V.tabs.direccion}
            desc="Objetivos del cuadro de mando por prioridad estratégica y horizonte."
            tags={[cuenta(v.catalog.objectives.length, "objetivo")]} />
          <ModuleCard href={`${base}/panel/convencion?t=okr`} code="KR" title={V.tabs.okr}
            desc="Cada objetivo con sus resultados clave: definición, línea base, meta, dueño y plazo."
            tags={[cuenta(v.kpis.length, "resultado clave", "resultados clave")]} />
          <ModuleCard href={`${base}/panel/convencion?t=iniciativas`} code="IN" title={V.tabs.iniciativas}
            desc="Las iniciativas del plan, vinculadas al resultado clave que mueven."
            tags={[cuenta(initiatives.length, "iniciativa")]} />
          <ModuleCard href={`${base}/panel/convencion?t=priorizacion`} code="PR" title={V.tabs.priorizacion}
            desc="Calificación con la matriz D·E·M·L por sesión de prioridad, ranking y trimestre de inicio."
            tags={["Matriz D·E·M·L"]} />
          <ModuleCard href={`${base}/panel/convencion?t=portafolio`} code="PO" title={V.tabs.portafolio}
            desc="Decisión de tiempo por iniciativa y portafolio por prioridad estratégica."
            tags={[roadmap]} />
          <ModuleCard href={`${base}/panel/bi`} code="M7" title="Inteligencia"
            desc="Contexto del sector con datos reales y lectura territorial."
            tags={[v.catalog.company.sector || "Sector"]} />
        </div>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ModuleCard href={`${base}/panel/diagnostico`} code="M1" title="Diagnóstico de capacidades"
            desc={`Radar de capacidades, mapa de calor de las ${DIMS.length} dimensiones, evidencia por práctica y serie de mediciones.`}
            tags={[cuenta(DIMS.length, "dimensión", "dimensiones"), cuenta(PRACTICES.length, "evidencia")]} />
          <ModuleCard href={`${base}/panel/benchmark`} code="M2" title="Benchmark"
            desc="Posición sectorial frente a pares comparables y presencia territorial por departamento."
            tags={[v.catalog.company.sector || "Sector", cuenta(v.catalog.territories?.length ?? 0, "departamento")]} />
          <ModuleCard href={`${base}/panel/estrategia`} code="M3" title="Estrategia · cuadro de mando y OKR"
            desc="Objetivo, resultados clave, dimensión que instala e iniciativa: la trazabilidad completa, navegable."
            tags={[cuenta(PERSPECTIVES.length, "perspectiva"), cuenta(v.catalog.objectives.length, "objetivo")]} />
          <ModuleCard href={`${base}/panel/kpi`} code="M4" title="Indicadores"
            desc="Batería de KPI con dueño, fuente, periodicidad, serie histórica y semáforo frente a meta."
            tags={[cuenta(v.kpis.length, "indicador", "indicadores")]} />
          <ModuleCard href={`${base}/panel/ruta`} code="M5" title="Mapa de ruta"
            desc="Roadmap por horizontes con Gantt y la matriz de priorización (D·E·M·L)."
            tags={[roadmap, cuenta(initiatives.length, "iniciativa")]} />
          <ModuleCard href={`${base}/panel/iniciativas`} code="M6" title="Seguimiento de iniciativas"
            desc="Avance, presupuesto en tres estados y factores críticos de éxito en semáforo."
            tags={[fmtCOP(budget.planned)]} />
        </div>
        )}
      </div>
    </>
  );
}


/* ═══ Lista de arranque (MASTER · «Estados vacíos y primer uso»): los pasos del método con su avance y enlace directo,
   mientras la empresa no tenga medición publicada. Vocabulario según el modo. ═══ */
function ArranqueCard() {
  const base = useBase();
  const v = useCatalog();
  const V = vocabOf(v.catalog.company);
  const c = v.catalog;
  const f1On = hasInstrument(c.company, "f1");
  const [respuestas, setRespuestas] = useState<number | null>(null);
  useEffect(() => {
    const url = f1On ? "/api/td/f1" : "/api/td/test";
    fetch(url).then((r) => (r.ok ? r.json() : null)).then((j) => setRespuestas(j ? (j.responses?.length ?? 0) : 0)).catch(() => setRespuestas(0));
  }, [f1On]);
  const t = (tab: string) => `${base}/panel/convencion?t=${tab}`;
  const levers = leversOf(c.company);
  const pasos = [
    { label: V.tabs.prioridades, n: levers.length, meta: `${levers.length} de hasta 8`, href: t(V.modo === "acompanamiento" ? "prioridades" : "direccion") },
    { label: V.tabs.direccion, n: c.objectives.length, meta: cuenta(c.objectives.length, "objetivo"), href: t("direccion") },
    { label: V.tabs.okr, n: v.kpis.length, meta: cuenta(v.kpis.length, "resultado clave", "resultados clave"), href: t("okr") },
    { label: V.tabs.iniciativas, n: v.initiatives.length, meta: cuenta(v.initiatives.length, "iniciativa"), href: t("iniciativas") },
    { label: f1On ? "Autoevaluación directiva" : "Test de capacidad empresarial", n: respuestas ?? 0, meta: respuestas === null ? "…" : cuenta(respuestas, "respuesta"), href: `${base}/panel/diagnostico/${f1On ? "autoevaluacion" : "test"}` },
  ];
  const hechos = pasos.filter((p) => p.n > 0).length;
  if (hechos === pasos.length) return null;
  return (
    <Card className="rise mb-5">
      <CardHeader title="Lista de arranque" sub={`${hechos} de ${pasos.length} pasos con información · el panel se llena a medida que avanza el método`} />
      <ol className="grid gap-2 px-5 pb-5 sm:grid-cols-5">
        {pasos.map((p, i) => (
          <li key={p.label}>
            <Link href={p.href} className={`group flex h-full flex-col gap-1.5 rounded-xl border px-3.5 py-3 transition-colors ${p.n > 0 ? "border-line bg-surface-2/60" : "border-dashed border-line-strong hover:border-gold hover:bg-gold-wash/40"}`}>
              <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-faint">{p.n > 0 ? <CheckCircle2 size={14} className="text-ok" /> : <Circle size={14} />} Paso {i + 1}</span>
              <span className="text-[13.5px] font-bold leading-snug text-ink group-hover:text-cyan-deep">{p.label}</span>
              <span className="num mt-auto text-[12px] text-muted">{p.meta}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// Vista pública de solo lectura — para la junta de socios y los aliados que
// acompañan el crecimiento. Sin sesión: el acceso lo da el token firmado.
// Server component: no expone APIs ni interacción de edición.

import { notFound } from "next/navigation";
import { verifyPublicToken } from "@/lib/public-token";
import { LINES, fmtCOP, fmtNum } from "@/data/demo";
import { executiveSummary } from "@/lib/logic";
import { hydrateCompanies, companyBySlug, tenantView } from "@/server/store";
import { scoresOf } from "@/lib/vista";
import { inTenant } from "@/app/api/td/_helpers";
import { AlgoritmoMark } from "@/components/logo";
import { MaturityRadar, ScoreGauge } from "@/components/charts";
import { ShieldAlert, AlertTriangle, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

const SEM_COLOR = { OK: "var(--ok)", WARN: "var(--warn)", BAD: "var(--bad)" } as const;
const RISK_CLS: Record<string, string> = {
  BAJO: "chip chip-ok", MEDIO: "chip", ALTO: "chip chip-warn", "CRÍTICO": "chip chip-bad",
};
const STATUS_LABEL: Record<string, string> = {
  PLANEADA: "Planeada", EN_CURSO: "En curso", EN_RIESGO: "En riesgo",
  COMPLETADA: "Completada", SUSPENDIDA: "Suspendida",
};

export default async function PublicView(
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const [slug, ...rest] = token.split("-");
  await hydrateCompanies();
  const company = companyBySlug(slug);
  if (!company?.active || !verifyPublicToken(slug, rest.join("-"))) notFound();
  const INSTITUTION = company;

  const { s, scores } = await inTenant(slug, async () => { const v = tenantView(); return { s: executiveSummary(v), scores: scoresOf(v) }; });
  const criticals = s.alerts.filter((a) => a.severity === 1);
  const inisSorted = [...s.initiatives].sort((a, b) => b.risk.score - a.risk.score);

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-8 sm:px-8">
      {/* cabecera */}
      <header className="mb-8 flex flex-wrap items-center gap-4">
        <AlgoritmoMark size={34} />
        <div className="min-w-0 flex-1">
          <div className="kicker">4Shine Empresas · Plataforma de gestión estratégica</div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink">{INSTITUTION.name}</h1>
        </div>
        <span className="chip chip-cyan"><Eye size={11} /> Vista pública de solo lectura</span>
      </header>

      <div className="mb-4 rounded-xl px-4 py-2.5 text-[12px]"
        style={{ background: "var(--gold-wash)", color: "var(--gold)" }}>
        Datos ilustrativos de demostración. Medición vigente: {s.maturity.assessment.label} ({s.maturity.assessment.period}).
      </div>

      {/* madurez */}
      <section className="panel mb-5 grid gap-8 px-7 py-6 lg:grid-cols-[230px_1fr_300px] lg:items-center">
        <div>
          <div className="label mb-2">Madurez de la empresa</div>
          <ScoreGauge value={s.maturity.institution.value} />
          <div className="num mt-2 text-center text-[11.5px] text-muted">
            Serie: {s.maturity.history.map((h) => h.institution.toFixed(2).replace(".", ",")).join(" → ")}
          </div>
        </div>
        <div className="space-y-3.5">
          <div className="label">Avance por línea (frente al corte anterior)</div>
          {s.maturity.lines.map((l) => {
            const meta = LINES.find((x) => x.n === l.n)!;
            return (
              <div key={l.n}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-[13px] font-bold text-ink">{l.code} <span className="font-semibold text-ink-soft">{l.name}</span></span>
                  <span className="num text-[12px] text-muted">
                    {l.prev?.toFixed(1) ?? "—"} → <b className="text-cyan-deep">{l.value.toFixed(1)}</b>
                    <span className="text-faint"> / meta {l.target.toFixed(1)}</span>
                  </span>
                </div>
                <div className="relative h-[8px] overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${(l.value / 5) * 100}%`, background: meta.color }} />
                  <div className="absolute top-0 h-full border-l-[1.5px] border-dashed border-gold" style={{ left: `${(l.target / 5) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden lg:block"><MaturityRadar size={300} scores={scores} /></div>
      </section>

      {/* alertas críticas */}
      {criticals.length > 0 && (
        <section className="panel mb-5 px-6 py-5">
          <div className="label mb-3 flex items-center gap-1.5" style={{ color: "var(--bad)" }}>
            <ShieldAlert size={12} /> Asuntos que requieren decisión directiva
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {criticals.map((a) => (
              <div key={a.id} className="rounded-xl px-4 py-3"
                style={{ background: "color-mix(in srgb, var(--bad) 6%, white)" }}>
                <div className="text-[13px] font-bold text-ink">{a.title}</div>
                <div className="mt-0.5 text-[12px] leading-snug text-muted">{a.detail}</div>
                {a.owner && <div className="num mt-1 text-[10px] text-faint">{a.owner}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* indicadores */}
      <section className="panel mb-5 px-6 py-5">
        <div className="label mb-3">Indicadores · semáforo frente a meta</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {s.kpis.map(({ code, name, health }) => (
            <div key={code} className="flex items-center gap-2.5 rounded-lg bg-surface-2/60 px-3 py-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SEM_COLOR[health.semaphore] }} />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{name}</span>
              <span className="num shrink-0 text-[11.5px] font-bold text-ink-soft">
                {fmtNum(health.latest, 1)}
              </span>
              {!health.projection.willReachTarget && (
                <AlertTriangle size={11} className="shrink-0" style={{ color: "var(--warn)" }} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex items-center gap-4 text-[10.5px] text-faint">
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: "var(--ok)" }} /> en meta</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: "var(--warn)" }} /> en avance</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: "var(--bad)" }} /> rezagado</span>
          <span className="flex items-center gap-1"><AlertTriangle size={10} style={{ color: "var(--warn)" }} /> el ritmo no alcanza la meta</span>
        </div>
      </section>

      {/* cartera de iniciativas */}
      <section className="panel mb-5 overflow-hidden">
        <div className="label px-6 pb-1 pt-5">
          Cartera de iniciativas · {fmtCOP(s.budget.planned)} ·{" "}
          {Math.round(((s.budget.executed + s.budget.committed) / s.budget.planned) * 100)} % comprometido+ejecutado
        </div>
        <div className="overflow-x-auto px-3 pb-4 pt-2">
          <table className="w-full min-w-[640px] text-[12.5px]">
            <tbody>
              {inisSorted.map((i) => (
                <tr key={i.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-semibold text-ink">{i.name}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{STATUS_LABEL[i.status]}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-[6px] w-24 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-cyan" style={{ width: `${i.progress}%` }} />
                      </div>
                      <span className="num text-[10.5px] text-muted">{i.progress} %</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <span className={RISK_CLS[i.risk.level]}>{i.risk.level.toLowerCase()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="pb-4 pt-2 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-faint">
        Generado por la PGTD · Algoritmo T S.A.S. · Enlace de solo lectura — no permite editar ni descargar datos personales
      </footer>
    </div>
  );
}

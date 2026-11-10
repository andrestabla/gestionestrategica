import { catalog, getDecision, diagnosticoResumenCap, getChecklistCap } from "@/server/store";
import { leversOf } from "@/data/catalogo";
import { DIMS } from "@/data/mapa";
import { AYUDA_CAPACIDADES } from "@/lib/metodologia-ayuda";
import { contextoEmpresa } from "@/server/contexto-empresa";
import type { encargoCapacidades } from "@/lib/capacidades";

/** Todo lo que la plataforma sabe de una iniciativa para los encargos de Capacidades (personalizar y lectura inicial). */
export function contextoCapacidades(iniId: string): Parameters<typeof encargoCapacidades>[0] | null {
  const c = catalog();
  const i = c.initiatives.find((x) => x.id === iniId);
  if (!i) return null;
  const kr = c.kpis.find((k) => k.code === i.kpi);
  const objetivo = c.objectives.find((o) => o.id === i.cmi);
  const lever = leversOf(c.company).find((l) => l.id === objetivo?.lever);
  const dim = DIMS.find((d) => d.code === i.capability);
  return {
    empresa: { name: c.company.name, sector: c.company.sector, size: c.company.size },
    ini: { id: i.id, name: i.name, objetivo: i.objetivo, start: i.start, end: i.end, budgetPlanned: i.budgetPlanned, budgetCurrency: i.budgetCurrency ?? c.company.currency ?? "COP", capability: i.capability, capabilityName: dim?.name, owner: c.responsibles.find((r) => r.id === i.ownerId)?.dependencia, observaciones: i.observaciones, decision: getDecision(i.id)?.decision ?? null },
    kr: kr ? { code: kr.code, name: kr.name, baseline: kr.baseline != null ? String(kr.baseline) : undefined, target: kr.target != null ? String(kr.target) : undefined, unit: kr.unit, due: kr.due } : undefined,
    objetivo: objetivo ? { id: objetivo.id, name: objetivo.name } : undefined,
    prioridad: lever ? { name: lever.name, sponsor: c.responsibles.find((r) => r.id === lever.ownerId)?.dependencia } : undefined,
    diagnostico: diagnosticoResumenCap() || undefined,
    ayuda: AYUDA_CAPACIDADES, contexto: contextoEmpresa(), fecha: new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }),
    checklist: getChecklistCap(iniId)?.frentes,
  };
}

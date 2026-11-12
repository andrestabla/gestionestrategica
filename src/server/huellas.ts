// Huellas de lo que validan los asistentes (objetivos e iniciativas de un horizonte): si cambia el contenido,
// la validación guardada se marca como desactualizada. Las usan las rutas de validación y el constructor de la
// instancia demo (para que sus validaciones queden al día).

import { createHash } from "node:crypto";
import { catalog } from "@/server/store";
import { leversOf } from "@/data/catalogo";

export const huellaAlineacion = (horizon: string) => {
  const c = catalog();
  const levers = leversOf(c.company).map((l) => [l.id, l.name, l.indicator ?? "", l.desc ?? ""]);
  const objs = c.objectives.filter((o) => o.horizon === horizon && !o.okr && !o.descartado).map((o) => [o.id, o.lever ?? "", o.name, o.desc ?? "", o.indicator ?? "", o.pillar ?? ""]);
  return createHash("sha256").update(JSON.stringify({ v: 3, levers, objs })).digest("hex").slice(0, 24);
};

export const huellaIniciativas = (horizon: string) => {
  const c = catalog();
  const inis = c.initiatives.filter((i) => i.horizon === horizon).map((i) => [i.id, i.name, i.objetivo ?? "", i.metaResultado ?? "", i.cmi, [i.kpi ?? "", ...(i.krExtra ?? [])].join("+").replace(/\+$/, ""), i.ownerId, i.start ?? "", i.end ?? "", i.capability ?? "", i.budgetCurrency ? `${i.budgetPlanned ?? 0} ${i.budgetCurrency}` : (i.budgetPlanned ?? 0), i.observaciones ?? "", ...(i.categoria ? [i.categoria] : [])]);
  return createHash("sha256").update(JSON.stringify({ v: 2, inis })).digest("hex").slice(0, 24);
};

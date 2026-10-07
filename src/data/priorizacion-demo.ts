// Evaluaciones demo de la matriz 4Shine de priorización: tres evaluadores
// (advisor, gerencia y junta) sobre el portafolio de Andina, y las decisiones
// de tiempo tomadas por la gerencia. Ilustrativas; la plataforma las reemplaza
// con las evaluaciones reales de la convención.

import type { Evaluation, Decision } from "@/lib/priorizacion";

const ev = (iniId: string, by: string, name: string, role: string, D: 1|2|3|4, E: 1|2|3|4, M: 1|2|3|4, L: 1|2|3|4, strategic: number, notes?: Evaluation["notes"]): Evaluation => ({
  iniId, by, name, role, scores: { D, E, M, L },
  type: { contribucion: strategic >= 1 ? "ESTRATEGICO" : "TACTICO", profundidad: strategic >= 2 ? "ESTRATEGICO" : "TACTICO", alcance: strategic >= 3 ? "ESTRATEGICO" : "TACTICO", permanencia: strategic >= 4 ? "ESTRATEGICO" : "TACTICO" },
  notes, at: "2027-02-18T15:00:00.000Z",
});
const ADV = ["advisor@4shine.co", "Advisor 4Shine", "CONSULTOR"] as const;
const GER = ["gerencia@andina.example", "Laura Restrepo", "LIDER"] as const;
const JUN = ["junta@andina.example", "Junta de socios", "DIRECTIVO"] as const;

export const EVALUATIONS_SEED: Evaluation[] = [
  // i1 · plan trimestral con responsables únicos — decisiva, capacidad confirmada
  ev("i1", ...ADV, 4, 4, 3, 4, 4, { D: "Elimina la restricción principal: prioridades sin dueño.", E: "Cierre de compromisos semanal con umbral del 80 %." }),
  ev("i1", ...GER, 4, 3, 3, 4, 3),
  ev("i1", ...JUN, 4, 3, 3, 3, 3),
  // i2 · delegación por escrito — alto impacto, evidencia por afinar
  ev("i2", ...ADV, 4, 3, 3, 3, 4, { E: "Falta el umbral para decidir continuar: % de decisiones que vuelven al gerente." }),
  ev("i2", ...GER, 3, 2, 3, 3, 3),
  ev("i2", ...JUN, 4, 3, 2, 3, 4),
  // i3 · estándar de procesos críticos — sostenible y replicable
  ev("i3", ...ADV, 3, 3, 4, 3, 3),
  ev("i3", ...GER, 3, 3, 4, 2, 2, { L: "Operaciones no tiene disponibilidad hasta cerrar el trimestre." }),
  // i4 · integración de sistemas — impacto directo, capacidad pendiente
  ev("i4", ...ADV, 3, 2, 3, 2, 3, { L: "Depende de la decisión de proveedor y del presupuesto 2027." }),
  ev("i4", ...GER, 3, 2, 3, 2, 2),
  ev("i4", ...JUN, 4, 2, 3, 2, 3),
  // i5 · estrategia en una página — completada; evaluada en la convención anterior
  ev("i5", ...ADV, 4, 4, 3, 4, 4),
  ev("i5", ...GER, 4, 4, 3, 4, 4),
  // i6 · caja a ocho semanas — táctica, fuerte en evidencia
  ev("i6", ...ADV, 3, 4, 3, 4, 1),
  ev("i6", ...GER, 3, 4, 2, 4, 1),
  ev("i6", ...JUN, 2, 4, 2, 4, 1),
  // i7 · mapa de talento — impacto limitado hoy, capacidad débil
  ev("i7", ...ADV, 2, 2, 3, 2, 2),
  ev("i7", ...GER, 3, 2, 2, 1, 2, { L: "Sin responsable con autoridad: Talento reporta a Administración." }),
  // i8 · apertura de Barranquilla — decisiva pero sin capacidad confirmada
  ev("i8", ...ADV, 4, 3, 4, 2, 4, { L: "La ficha de unidad replicable no está cerrada; sin ella la apertura es una apuesta." }),
  ev("i8", ...GER, 4, 2, 3, 2, 4),
  ev("i8", ...JUN, 4, 3, 4, 2, 4),
];

export type DecisionRecord = { iniId: string; decision: Decision; rationale?: string; by: string; name: string; at: string };

export const DECISIONS_SEED: DecisionRecord[] = [
  { iniId: "i1", decision: "IMPLEMENTAR", rationale: "Retrasarla compromete el cierre de compromisos del trimestre.", by: "gerencia@andina.example", name: "Laura Restrepo", at: "2027-02-18T16:00:00.000Z" },
  { iniId: "i2", decision: "IMPLEMENTAR", rationale: "Habilita la delegación que el resto del portafolio necesita.", by: "gerencia@andina.example", name: "Laura Restrepo", at: "2027-02-18T16:00:00.000Z" },
  { iniId: "i3", decision: "PREPARAR", rationale: "Etapa acotada: los cinco procesos de mayor impacto antes de cerrar el trimestre.", by: "gerencia@andina.example", name: "Laura Restrepo", at: "2027-02-18T16:00:00.000Z" },
  { iniId: "i4", decision: "PREPARAR", rationale: "Validar proveedor y presupuesto; sin capacidad confirmada no se implementa.", by: "gerencia@andina.example", name: "Laura Restrepo", at: "2027-02-18T16:00:00.000Z" },
  { iniId: "i6", decision: "IMPLEMENTAR", rationale: "Táctica, pero protege la caja mientras avanza el resto.", by: "gerencia@andina.example", name: "Laura Restrepo", at: "2027-02-18T16:00:00.000Z" },
  { iniId: "i7", decision: "BACKLOG", rationale: "Depende de definir el responsable de Talento con autoridad.", by: "gerencia@andina.example", name: "Laura Restrepo", at: "2027-02-18T16:00:00.000Z" },
  { iniId: "i8", decision: "PREPARAR", rationale: "Cerrar la ficha de unidad replicable y el modelo económico de la sede antes de abrir.", by: "gerencia@andina.example", name: "Laura Restrepo", at: "2027-02-18T16:00:00.000Z" },
];

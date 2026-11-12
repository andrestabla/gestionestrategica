// Gestión de proyectos · presupuesto ejecutado contra avance.
//
// Cada proyecto tiene un presupuesto planeado (en la ficha de la iniciativa) y un registro de
// movimientos: compromisos (lo contratado u obligado) y ejecuciones (lo gastado o pagado). Con el
// avance del plan de trabajo se obtiene el valor ganado (lo que debería haber costado lo hecho) y de
// ahí si el proyecto gasta más rápido de lo que avanza y en cuánto terminaría si sigue igual.
// Los valores de comprometido y ejecutado que ya traiga la ficha cuentan como saldo de apertura.
// Reglas puras; el store guarda los movimientos y exige permisos.

import type { Moneda } from "@/lib/dinero";
export type { Moneda };
export type GastoTipo = "COMPROMISO" | "EJECUCION";
export const GASTO_TIPOS: { id: GastoTipo; label: string; desc: string }[] = [
  { id: "EJECUCION", label: "Ejecución", desc: "Dinero ya gastado o pagado." },
  { id: "COMPROMISO", label: "Compromiso", desc: "Dinero contratado u obligado que aún no se paga." },
];
export const gastoTipoLabel = (t: string) => GASTO_TIPOS.find((x) => x.id === t)?.label ?? t;

export type Gasto = {
  id: string;            // GS-i3-01
  iniId: string;
  tipo: GastoTipo;
  concepto: string;
  monto: number;         // positivo, en la moneda del proyecto
  fecha: string;         // AAAA-MM-DD
  soporte?: string;      // factura, contrato, orden de compra
  by: string;            // correo de quien lo registró
  at: string;            // ISO
};
export type GastoInput = Partial<Pick<Gasto, "iniId" | "tipo" | "concepto" | "monto" | "fecha" | "soporte">>;

const DIA = /^\d{4}-\d{2}-\d{2}$/;
export function gastoError(g: GastoInput): string | null {
  if (!GASTO_TIPOS.some((t) => t.id === g.tipo)) return "Indica si es una ejecución o un compromiso.";
  if (typeof g.concepto !== "string" || g.concepto.trim().length < 3) return "Describe el concepto en al menos 3 caracteres.";
  if (typeof g.monto !== "number" || !Number.isFinite(g.monto) || g.monto <= 0) return "El monto es un número mayor que cero.";
  if (!g.fecha || !DIA.test(g.fecha)) return "La fecha va como AAAA-MM-DD.";
  return null;
}

export const REGLAS_PRESUPUESTO = {
  /** Diferencia mínima, en puntos porcentuales, entre lo ejecutado y lo avanzado para que sea una señal. */
  brechaMinima: 10,
  /** Avance mínimo para proyectar el costo al cierre (antes, la proyección es ruido). */
  avanceMinimoProyeccion: 10,
  /** Sobrecosto proyectado que ya es alerta. */
  toleranciaProyeccion: 0.05,
} as const;

export type EstadoPresupuesto = "SIN_PRESUPUESTO" | "SIN_EJECUCION" | "EN_LINEA" | "ALERTA" | "SOBRECOSTO";
export const ESTADO_PRESUPUESTO: Record<EstadoPresupuesto, { label: string; chip: string; desc: string }> = {
  SIN_PRESUPUESTO: { label: "Sin presupuesto", chip: "", desc: "El proyecto no tiene presupuesto planeado en su ficha." },
  SIN_EJECUCION: { label: "Sin ejecución", chip: "", desc: "Tiene presupuesto y aún no registra compromisos ni ejecuciones." },
  EN_LINEA: { label: "En línea", chip: "chip-ok", desc: "Lo ejecutado va acorde con lo avanzado." },
  ALERTA: { label: "En alerta", chip: "chip-warn", desc: "Gasta más rápido de lo que avanza, o lo comprometido ya supera lo planeado." },
  SOBRECOSTO: { label: "Sobrecosto", chip: "chip-bad", desc: "Lo ejecutado ya supera el presupuesto planeado." },
};

export type PresupuestoProyecto = {
  moneda: Moneda;
  planeado: number;
  comprometido: number;         // apertura + compromisos registrados
  ejecutado: number;            // apertura + ejecuciones registradas
  apertura: { comprometido: number; ejecutado: number };   // lo que ya traía la ficha de la iniciativa
  disponible: number;           // planeado − lo ya obligado (el mayor entre comprometido y ejecutado)
  pctEjecutado: number | null;  // ejecutado ÷ planeado × 100
  pctComprometido: number | null;
  valorGanado: number | null;   // planeado × avance: lo que debería haber costado lo hecho
  indiceCosto: number | null;   // valor ganado ÷ ejecutado · menos de 1: cada peso rinde menos de lo planeado
  brecha: number | null;        // puntos porcentuales: % ejecutado − % avance (positivo: gasta más rápido de lo que avanza)
  proyeccion: number | null;    // costo estimado al cierre si sigue rindiendo igual
  sobrecosto: number | null;    // proyección − planeado
  estado: EstadoPresupuesto;
};

const r1 = (x: number) => Math.round(x * 10) / 10;

/** Lectura del presupuesto de un proyecto. `avance`: trabajo ejecutado de su plan (0–100) o nulo si no tiene tareas. */
export function presupuestoDe(ini: { id: string; budgetPlanned: number; budgetCommitted: number; budgetExecuted: number; budgetCurrency?: Moneda }, gastos: Gasto[], avance: number | null, monedaEmpresa: Moneda = "COP"): PresupuestoProyecto {
  const mios = gastos.filter((g) => g.iniId === ini.id);
  const suma = (t: GastoTipo) => mios.filter((g) => g.tipo === t).reduce((a, g) => a + g.monto, 0);
  const apertura = { comprometido: Math.max(0, ini.budgetCommitted || 0), ejecutado: Math.max(0, ini.budgetExecuted || 0) };
  const planeado = Math.max(0, ini.budgetPlanned || 0), comprometido = apertura.comprometido + suma("COMPROMISO"), ejecutado = apertura.ejecutado + suma("EJECUCION");
  const pctEjecutado = planeado ? r1((ejecutado / planeado) * 100) : null, pctComprometido = planeado ? r1((comprometido / planeado) * 100) : null;
  const valorGanado = planeado && avance !== null ? Math.round(planeado * (avance / 100)) : null;
  const indiceCosto = valorGanado !== null && ejecutado > 0 ? Math.round((valorGanado / ejecutado) * 100) / 100 : null;
  const brecha = pctEjecutado !== null && avance !== null && ejecutado > 0 ? r1(pctEjecutado - avance) : null;
  const proyeccion = planeado && avance !== null && avance >= REGLAS_PRESUPUESTO.avanceMinimoProyeccion && ejecutado > 0 ? Math.round(ejecutado / (avance / 100)) : null;
  const sobrecosto = proyeccion !== null ? proyeccion - planeado : null;
  const estado: EstadoPresupuesto = !planeado ? "SIN_PRESUPUESTO" : !ejecutado && !comprometido ? "SIN_EJECUCION" : ejecutado > planeado ? "SOBRECOSTO"
    : (brecha !== null && brecha >= REGLAS_PRESUPUESTO.brechaMinima) || comprometido > planeado || (sobrecosto !== null && sobrecosto > planeado * REGLAS_PRESUPUESTO.toleranciaProyeccion) ? "ALERTA" : "EN_LINEA";
  return { moneda: ini.budgetCurrency ?? monedaEmpresa, planeado, comprometido, ejecutado, apertura, disponible: planeado - Math.max(comprometido, ejecutado), pctEjecutado, pctComprometido, valorGanado, indiceCosto, brecha, proyeccion, sobrecosto, estado };
}

/** Totales del portafolio por moneda (no se suman monedas distintas). */
export function totalesPorMoneda(ps: PresupuestoProyecto[]): { moneda: Moneda; proyectos: number; planeado: number; comprometido: number; ejecutado: number; valorGanado: number; pctEjecutado: number | null; pctAvance: number | null }[] {
  return (["COP", "USD"] as Moneda[]).map((moneda) => {
    const xs = ps.filter((p) => p.moneda === moneda && p.planeado > 0);
    const planeado = xs.reduce((a, p) => a + p.planeado, 0), ejecutado = xs.reduce((a, p) => a + p.ejecutado, 0), conAvance = xs.filter((p) => p.valorGanado !== null);
    const valorGanado = conAvance.reduce((a, p) => a + p.valorGanado!, 0), planeadoConAvance = conAvance.reduce((a, p) => a + p.planeado, 0);
    return { moneda, proyectos: xs.length, planeado, comprometido: xs.reduce((a, p) => a + p.comprometido, 0), ejecutado, valorGanado,
      pctEjecutado: planeado ? r1((ejecutado / planeado) * 100) : null, pctAvance: planeadoConAvance ? r1((valorGanado / planeadoConAvance) * 100) : null };
  }).filter((t) => t.proyectos > 0);
}

/** Dinero con separador de miles: «COP 12.500.000». */
export const dinero = (n: number, moneda: Moneda) => `${moneda} ${Math.round(n).toLocaleString("es-CO")}`;
/** Dinero abreviado para tarjetas: «COP 12,5 M», «USD 130 mil». */
export function dineroCorto(n: number, moneda: Moneda): string {
  const a = Math.abs(n), f = (x: number) => x.toLocaleString("es-CO", { maximumFractionDigits: x >= 100 ? 0 : 1 });
  return `${moneda} ${a >= 1e9 ? `${f(n / 1e9)} mil M` : a >= 1e6 ? `${f(n / 1e6)} M` : a >= 1e4 ? `${f(n / 1e3)} mil` : Math.round(n).toLocaleString("es-CO")}`;
}

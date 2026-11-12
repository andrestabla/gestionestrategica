// Gestión de proyectos · ruta crítica y fin previsto de un proyecto.
//
// Con las fechas del plan y las dependencias entre tareas se calcula, para cada tarea, su holgura:
// cuántos días puede correrse sin mover el fin del proyecto. Las de holgura cero forman la ruta
// crítica. Aparte, con el estado real de cada tarea a la fecha, se proyecta cuándo terminaría el
// proyecto si lo pendiente tarda lo planeado: el fin previsto. Reglas puras.

import { diasEntre, type Task, type TaskStatus } from "@/data/proyectos";

/** Parte del trabajo que se da por hecha según el estado (la misma escala del tablero de impacto). */
export const CREDITO: Record<TaskStatus, number> = { HECHA: 1, EN_REVISION: 0.8, EN_CURSO: 0.4, BLOQUEADA: 0.2, POR_HACER: 0 };

export type NodoRuta = {
  id: string;
  holgura: number | null;     // días que puede correrse sin mover el fin; nulo si hay un ciclo de dependencias
  critica: boolean;           // holgura cero o negativa
  conflicto: boolean;         // empieza antes de que termine una tarea de la que depende
  finPrevisto: string;        // AAAA-MM-DD · cuándo terminaría según su estado a la fecha
  atraso: number;             // días que su fin previsto supera a su compromiso (0 si va en fecha)
};
export type RutaCritica = {
  fin: string | null;         // fin planeado: el último compromiso
  finPrevisto: string | null; // fin proyectado con el estado a la fecha
  desvio: number;             // días entre el fin planeado y el previsto (positivo: se corre)
  criticas: string[];         // tareas de la ruta crítica, en orden de inicio
  ciclo: boolean;             // las dependencias forman un ciclo: no hay ruta que calcular
  nodos: Record<string, NodoRuta>;
};

export const sumarDias = (iso: string, dias: number): string => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10); };
const max = (a: string, b: string) => (a > b ? a : b);

/** Orden topológico de las tareas (las dependencias primero); nulo si hay un ciclo. Solo cuentan dependencias dentro del conjunto. */
function ordenar(tasks: Task[]): Task[] | null {
  const porId = new Map(tasks.map((t) => [t.id, t])), estado = new Map<string, 1 | 2>(), out: Task[] = [];
  const visitar = (t: Task): boolean => {
    const e = estado.get(t.id); if (e === 2) return true; if (e === 1) return false;
    estado.set(t.id, 1);
    for (const d of t.dependsOn ?? []) { const p = porId.get(d); if (p && !visitar(p)) return false; }
    estado.set(t.id, 2); out.push(t); return true;
  };
  for (const t of tasks) if (!visitar(t)) return null;
  return out;
}

/** ¿Añadir estas dependencias a la tarea `id` formaría un ciclo? */
export function formaCiclo(tasks: Task[], id: string, deps: string[]): boolean {
  return ordenar(tasks.map((t) => (t.id === id ? { ...t, dependsOn: deps } : t))) === null;
}

/** Ruta crítica y fin previsto del conjunto de tareas de un proyecto, a la fecha `hoy`. */
export function rutaCritica(tasks: Task[], hoy: string): RutaCritica {
  if (!tasks.length) return { fin: null, finPrevisto: null, desvio: 0, criticas: [], ciclo: false, nodos: {} };
  const fin = tasks.reduce((a, t) => max(a, t.due), tasks[0].due);
  const orden = ordenar(tasks);
  const ids = new Set(tasks.map((t) => t.id));
  const preds = (t: Task) => (t.dependsOn ?? []).filter((d) => ids.has(d));
  const porId = new Map(tasks.map((t) => [t.id, t]));
  if (!orden) {
    const nodos = Object.fromEntries(tasks.map((t) => [t.id, { id: t.id, holgura: null, critica: false, conflicto: false, finPrevisto: t.due, atraso: 0 } as NodoRuta]));
    return { fin, finPrevisto: fin, desvio: 0, criticas: [], ciclo: true, nodos };
  }
  // hacia atrás: lo más tarde que puede terminar cada tarea sin mover el fin
  const sucesoras = new Map<string, Task[]>();
  for (const t of tasks) for (const d of preds(t)) sucesoras.set(d, [...(sucesoras.get(d) ?? []), t]);
  const tarde = new Map<string, string>();   // fin más tardío
  for (const t of [...orden].reverse()) {
    const suc = sucesoras.get(t.id) ?? [];
    // el inicio más tardío de cada sucesora = su fin más tardío menos su duración; la predecesora debe terminar el día
    // anterior (una tarea que empieza al día siguiente de la que la precede es contigua: holgura cero)
    const limite = suc.reduce<string | null>((a, s) => { const ls = sumarDias(tarde.get(s.id)!, -diasEntre(s.start, s.due) - 1); return a === null || ls < a ? ls : a; }, null);
    tarde.set(t.id, limite ?? fin);
  }
  // hacia adelante: cuándo terminaría cada una con su estado a la fecha
  const previsto = new Map<string, string>();
  for (const t of orden) {
    const dur = Math.max(0, diasEntre(t.start, t.due));
    const finPreds = preds(t).reduce<string | null>((a, d) => { const f = previsto.get(d)!; return a === null || f > a ? f : a; }, null);
    let f: string;
    if (t.status === "HECHA") f = t.due <= hoy ? t.due : hoy;
    else if (t.status === "EN_CURSO" || t.status === "EN_REVISION") f = t.due >= hoy ? t.due : sumarDias(hoy, Math.max(1, Math.round(dur * (1 - CREDITO[t.status]))));
    else f = sumarDias([t.start, hoy, ...(finPreds ? [finPreds] : [])].reduce(max), dur);   // sin empezar o bloqueada: arranca cuando pueda y tarda lo planeado
    previsto.set(t.id, f);
  }
  const nodos: Record<string, NodoRuta> = {};
  for (const t of tasks) {
    const holgura = diasEntre(t.due, tarde.get(t.id)!), f = previsto.get(t.id)!;
    nodos[t.id] = { id: t.id, holgura, critica: holgura <= 0, conflicto: preds(t).some((d) => porId.get(d)!.due > t.start), finPrevisto: f, atraso: Math.max(0, diasEntre(t.due, f)) };
  }
  const finPrevisto = tasks.reduce((a, t) => max(a, previsto.get(t.id)!), previsto.get(tasks[0].id)!);
  return { fin, finPrevisto, desvio: diasEntre(fin, finPrevisto), ciclo: false, nodos,
    criticas: tasks.filter((t) => nodos[t.id].critica).sort((a, b) => a.start.localeCompare(b.start) || a.due.localeCompare(b.due)).map((t) => t.id) };
}

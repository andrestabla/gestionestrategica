// Andina Suministros como caso demo completo: la empresa ficticia de la plataforma reconstruida con todo el recorrido
// del método hecho (prioridades → objetivos 2027 → resultados clave → iniciativas → priorización → portafolio →
// capacidades → cascada) y la ejecución a mitad de 2027, más su historia previa (mediciones de capacidades 2026,
// evidencias, finanzas y territorio). No lleva datos de ningún cliente: se puede mostrar a cualquier cliente potencial.
// El generador es común (src/server/demo-builder.ts); Andina es la empresa de demostración por defecto, así que no se
// elimina: se reinicia conservando sus cuentas y accesos.

import { construirDemo, type PaqueteDemo } from "@/server/demo-builder";
import { DEFAULT_TENANT } from "@/server/tenant";
import { ANDINA_CATALOG, type Catalog } from "@/data/catalogo";
import { ANDINA_DOMINIO, HORIZONTES, RESPONSABLES, LEVERS, LB_PALANCA, OBJETIVOS, OBJETIVO_SIN_PRIORIDAD, KRS, INICIATIVAS, INICIATIVA_SIN_KR, INICIATIVAS_MAPEADAS, JUSTIFICACION_OBJETIVO, JUSTIFICACION_INI, TEXTOS, EVALUADORES, CALIFICACIONES, DECISIONES, CAPACIDADES, CHECKLISTS_PERSONALIZADOS, ARTICULACION, METAS, F1_PERFIL, F1_DIRECTIVOS } from "@/data/demo-andina/contenido";
import { HOY, PERSONAS, PLANES, RIESGOS, GASTOS, AVANCE_KR_T1, AVANCE_KR_POR_DEFECTO, NOTAS_KR_T1, AVANCE_INICIATIVAS, CIERRES_T1, MADUREZ_PERFIL, MADUREZ_SESGO, MADUREZ_SALVAGUARDAS, MADUREZ_CORTE } from "@/data/demo-andina/ejecucion";
import type { SessionUser } from "@/lib/session";

/** Línea base 2026: los objetivos e indicadores del primer ciclo de Andina, con la serie hasta el cierre de 2026. */
const A = ANDINA_CATALOG, INSTITUTION = A.company;
/** Territorio a mayo de 2027: Barranquilla ya es sede (abrió en marzo) y Cartagena queda como la siguiente oportunidad. */
const TERRITORIOS: Catalog["territories"] = A.territories.map((t) =>
  t.name === "Atlántico" ? { ...t, presence: "sede" as const, weight: 2 as const, reading: "Sede Barranquilla, abierta el 1 de marzo de 2027 con operador logístico: 38 clientes activos al cierre del primer trimestre." }
  : t.name === "Bolívar" ? { ...t, reading: "Demanda industrial de Cartagena (Mamonal) atendida hoy desde Barranquilla; candidata a cobertura con visita semanal en 2028." }
  : t);

const objetivosLB = A.objectives.map((o) => ({ ...o, horizon: "LB", lever: LB_PALANCA[o.id] }));
const kpisLB = A.kpis.map((k) => ({ ...k, due: "2026", series: k.series.filter((p) => p.period <= "2026-T4") }));

export const PAQUETE_ANDINA: PaqueteDemo = {
  slug: DEFAULT_TENANT, name: INSTITUTION.name, shortName: INSTITUTION.shortName, dominio: ANDINA_DOMINIO,
  company: { city: INSTITUTION.city, department: INSTITUTION.department, sector: INSTITUTION.sector, size: "85 colaboradores · 4 sedes", sectorKey: INSTITUTION.sectorKey, ciiu: INSTITUTION.ciiu, horizons: HORIZONTES },
  typeRule: "cresio", mode: "acompanamiento", instruments: ["test", "f1", "f2", "captura"],
  base: { responsibles: RESPONSABLES, objectives: objetivosLB, kpis: kpisLB },
  previo: { assessments: A.assessments, evidences: A.evidences, financials: A.financials, territories: TERRITORIOS },
  levers: LEVERS, objetivos: OBJETIVOS, krs: KRS, iniciativas: INICIATIVAS, iniciativasMapeadas: INICIATIVAS_MAPEADAS,
  objetivoSinPrioridad: OBJETIVO_SIN_PRIORIDAD, iniciativaSinKr: INICIATIVA_SIN_KR,
  textos: { justificacionObjetivo: JUSTIFICACION_OBJETIVO, justificacionIni: JUSTIFICACION_INI, ...TEXTOS },
  evaluadores: EVALUADORES, calificaciones: CALIFICACIONES, decisiones: DECISIONES, capacidades: CAPACIDADES, checklists: CHECKLISTS_PERSONALIZADOS,
  articulacion: ARTICULACION, metas: METAS, f1Perfil: F1_PERFIL, f1Directivos: F1_DIRECTIVOS,
  diagnostico: {
    test: [
      { email: "gerencia@andina.demo", name: "Gerencia general", cargo: "Gerente general", objetivo: "Crecer en la costa sin que la operación dependa de mí.", perfil: 3.1, q25: "C", fecha: "2026-09-14" },
      { email: "comercial@andina.demo", name: "Gerencia comercial", cargo: "Gerente comercial", objetivo: "Vender con margen y recuperar a los clientes que compran una vez y no vuelven.", perfil: 3.3, q25: "C", fecha: "2026-09-15" },
      { email: "finanzas@andina.demo", name: "Administración y finanzas", cargo: "Jefe administrativa y financiera", objetivo: "Dejar de reprocesar la información entre el sistema de pedidos y la contabilidad.", perfil: 2.8, q25: "D", fecha: "2026-09-15" },
    ],
    f2: {
      n: 24, desde: "2026-10-13", sesgo: 0.35,
      areas: ["Gerencia comercial", "Operaciones", "Administración y finanzas", "Servicio y posventa", "Sede Medellín", "Sede Cali"],
      abiertas: [
        "Las prioridades cambian cada semana según lo que pida el cliente más grande.",
        "No sabemos qué podemos decidir sin preguntarle a la gerente.",
        "Repetimos la misma información en tres sistemas.",
        "", "Falta que nos digan cómo vamos frente a la meta.",
        "El equipo de bodega no se entera de los compromisos de entrega hasta que el pedido está atrasado.",
        "", "En Medellín sentimos que las decisiones se toman en Bogotá.",
        "Me gustaría saber qué hace falta para crecer dentro de la empresa.",
        "", "Los descuentos dependen de quién llame.", "",
        "Cuando falta alguien, el trabajo se queda quieto.",
      ],
    },
    captura: { practicas: 40, fecha: "2027-04-26" },
  },
  ejecucion: {
    hoy: HOY, personas: PERSONAS, planes: PLANES, riesgos: RIESGOS, gastos: GASTOS,
    avanceKrT1: AVANCE_KR_T1, avanceKrPorDefecto: AVANCE_KR_POR_DEFECTO, notasKrT1: NOTAS_KR_T1, avanceIniciativas: AVANCE_INICIATIVAS, cierresT1: CIERRES_T1,
    madurezPerfil: MADUREZ_PERFIL, madurezSesgo: MADUREZ_SESGO, madurezSalvaguardas: MADUREZ_SALVAGUARDAS, madurezCorte: MADUREZ_CORTE,
  },
};

/** Reconstruye Andina Suministros como caso demo completo. `recrear`: vuelve a construirla aunque ya esté construida. */
export const crearDemoAndina = (actor: SessionUser, opts: { recrear?: boolean; archivos?: boolean } = {}) => construirDemo(actor, PAQUETE_ANDINA, opts);

"use client";

// Ayuda metodológica tipo presentación: qué es, para qué sirve, cómo se estructura y cómo se formula un objetivo
// directivo o un resultado clave, según el marco 4Shine Empresas. Se abre desde un botón en la barra de cada sección.

import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui";
import { BookOpen, ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

type Lamina = { t: string; k: string; body: ReactNode };
const Bien = ({ children }: { children: ReactNode }) => <div className="flex items-start gap-2 rounded-xl px-3 py-2 text-[12.5px] leading-snug" style={{ background: "color-mix(in srgb, var(--ok) 10%, var(--surface))" }}><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-ok" /><span>{children}</span></div>;
const Mal = ({ children }: { children: ReactNode }) => <div className="flex items-start gap-2 rounded-xl px-3 py-2 text-[12.5px] leading-snug" style={{ background: "color-mix(in srgb, var(--bad) 9%, var(--surface))" }}><XCircle size={14} className="mt-0.5 shrink-0 text-bad" /><span>{children}</span></div>;
const Li = ({ children }: { children: ReactNode }) => <li className="flex gap-2 text-[13px] leading-relaxed text-ink"><span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-deep" /><span>{children}</span></li>;

const OBJETIVOS: Lamina[] = [
  { k: "Qué es", t: "Un objetivo directivo baja una prioridad al año", body: <>
    <p className="text-[14px] leading-relaxed text-ink">Un <b>objetivo directivo</b> es el resultado concreto que la dirección se compromete a lograr en el horizonte (el año de planeación) para hacer avanzar una <b>prioridad estratégica</b>. La prioridad dice hacia dónde va la empresa en 3 a 5 años; el objetivo dice qué tiene que ser cierto al cierre del año para que esa prioridad avance.</p>
    <p className="mt-3 text-[13px] leading-relaxed text-muted">En el marco 4Shine Empresas pertenece a la capacidad de <b>Dirección</b>: traduce la estrategia en una página a compromisos verificables. Los <b>resultados clave</b> se formulan después, sobre cada objetivo; lo que sí se deja declarado desde el objetivo es su <b>indicador impulsor</b>, la medida que mejor resume el logro.</p>
  </> },
  { k: "Función", t: "Para qué sirve", body: <ul className="space-y-2">
    <Li><b>Da foco:</b> pocos objetivos por prioridad obligan a elegir qué resultados importan de verdad este año.</Li>
    <Li><b>Conecta la cadena:</b> prioridad → objetivo → resultados clave → iniciativas → cascada trimestral. Sin objetivo, los indicadores y proyectos quedan sueltos.</Li>
    <Li><b>Hace exigible la estrategia:</b> cada objetivo tiene un sponsor que rinde cuentas en el ritmo trimestral.</Li>
    <Li><b>Permite priorizar:</b> las iniciativas se califican por lo que aportan a un resultado clave de un objetivo, no por quién las propone.</Li>
  </ul> },
  { k: "Estructura", t: "Cómo se construye", body: <>
    <div className="rounded-2xl bg-surface-2 px-4 py-3 text-[13.5px] leading-relaxed text-ink"><b>Verbo de logro</b> + <b>resultado</b> + <b>indicador impulsor</b> + <b>para cuándo</b>.</div>
    <ul className="mt-3 space-y-2">
      <Li><b>Verbo de logro:</b> alcanzar, consolidar, obtener, reducir, posicionar; nunca «gestionar», «trabajar en» o «implementar» (eso describe actividad).</Li>
      <Li><b>Resultado:</b> qué queda logrado en el negocio, con su alcance (línea, canal, planta, mercado).</Li>
      <Li><b>Indicador impulsor:</b> la medida con la que se seguirá el logro. Se declara ya; las cifras (base y meta) se fijan después en los resultados clave.</Li>
      <Li><b>Para cuándo:</b> el cierre del horizonte o un hito dentro de él.</Li>
      <Li>Además: <b>una prioridad</b> (aporta a su indicador), <b>un sponsor</b> que responde por él y una <b>aspiración</b> de una o dos frases.</Li>
    </ul>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Bien>«<b>Obtener</b> la certificación BPM de la planta farmacéutica ante el INVIMA, <b>medida por</b> la resolución de certificación emitida, <b>antes del cierre</b> de 2027.»</Bien>
      <Bien>«<b>Consolidar</b> la cobertura del panel médico prioritario con un modelo presencial y digital, <b>medida por</b> la frecuencia de visita a médicos AAA y AA, <b>al cierre del primer semestre</b> de 2027.»</Bien>
      <Mal>«Mejorar la operación de la planta.» (sin resultado, sin indicador impulsor, sin plazo)</Mal>
      <Mal>«Implementar el nuevo CRM comercial en 2027.» (es una iniciativa: describe lo que se hace, no lo que queda logrado)</Mal>
      <Mal>«Subir la participación de mercado de 3,1 % a 3,4 %.» (es un resultado clave: ya trae base y meta; falta el logro que lo explica)</Mal>
    </div>
  </> },
  { k: "Tips", t: "Para formularlos bien", body: <ul className="space-y-2">
    <Li><b>Resultado, no actividad:</b> «reunir al comité» o «implementar un sistema» son tareas o iniciativas; «reducir el backorder técnico, medido por el backorder mensual, al cierre de 2027» es un objetivo.</Li>
    <Li><b>Sin cifras de meta:</b> el «cuánto» va en los resultados clave; si el enunciado ya trae base y meta, probablemente es un resultado clave, no un objetivo.</Li>
    <Li><b>Un logro por enunciado:</b> si hay un «y» que une dos resultados distintos, son dos objetivos.</Li>
    <Li><b>Verificable:</b> alguien externo debe poder decir si se cumplió o no con evidencia.</Li>
    <Li><b>De 1 a 3 por prioridad:</b> más de eso diluye el foco y la capacidad de ejecución.</Li>
    <Li><b>Con el lenguaje del negocio:</b> mercado, canal, producto, planta, regulación; nada de jerga genérica.</Li>
    <Li><b>Coherente con el sector y los datos:</b> ambición alta pero posible con la capacidad instalada y el contexto competitivo y regulatorio.</Li>
    <Li><b>Sin duplicados:</b> dos objetivos que persiguen lo mismo desde prioridades distintas se funden o se diferencian.</Li>
  </ul> },
  { k: "Validación", t: "Qué revisa la validación de alineación", body: <>
    <p className="text-[13px] leading-relaxed text-ink">El botón <b>Validar alineación</b> pide al modelo una lectura de cada objetivo frente a su prioridad, al conjunto de prioridades, a los demás objetivos y al contexto de la empresa (sector, negocio y datos). Las prioridades no se cuestionan: ya están validadas por la dirección. Además del semáforo, señala duplicidades entre objetivos y enunciados que en realidad son resultados clave o iniciativas.</p>
    <div className="mt-3 space-y-2 text-[12.5px]">
      <div className="flex items-center gap-2"><span className="chip chip-ok">Alineado</span><span className="text-muted">contribuye de forma directa a su prioridad y está bien formulado.</span></div>
      <div className="flex items-center gap-2"><span className="chip chip-gold">Parcialmente alineado</span><span className="text-muted">contribuye de forma parcial o indirecta, o tiene problemas de formulación o de forma.</span></div>
      <div className="flex items-center gap-2"><span className="chip chip-bad">No alineado</span><span className="text-muted">no aporta a su prioridad, pertenece a otra o no es un objetivo.</span></div>
    </div>
    <p className="mt-3 text-[12.5px] leading-relaxed text-muted">La validación es exigente: solo es verde el objetivo que aporta de forma inequívoca a su prioridad, tiene los cuatro elementos de la estructura, es un objetivo (no un KR ni una iniciativa), no duplica a otro y es coherente con el mercado y la posición de la empresa. Al pulsar cada semáforo se ve la justificación, qué elementos faltan, qué hacer y una redacción propuesta que se puede aplicar con un clic. La lectura se marca desactualizada cuando cambian las prioridades o los objetivos.</p>
  </> },
];

const KR: Lamina[] = [
  { k: "Qué es", t: "Un resultado clave hace medible el objetivo", body: <>
    <p className="text-[14px] leading-relaxed text-ink">Un <b>resultado clave</b> es la medida cuantitativa que indica si el objetivo directivo se está logrando. No describe qué se hace, sino qué cambia y cuánto: tiene <b>línea base</b>, <b>meta</b> y <b>plazo</b>.</p>
    <p className="mt-3 text-[13px] leading-relaxed text-muted">Cada objetivo lleva de 2 a 4 resultados clave (máximo 5). Juntos deben bastar para afirmar, con datos, que el objetivo se cumplió. Son mucho más específicos que el objetivo: donde el objetivo declara el indicador impulsor, el resultado clave pone la cifra.</p>
    <p className="mt-3 text-[13px] leading-relaxed text-muted"><b>Línea base para 2027:</b> los resultados cerrados de 2026 (están en Objetivos directivos → «Consulta · 2026 · línea base»). El valor con que cerró 2026 es el punto de partida del resultado clave 2027.</p>
  </> },
  { k: "Función", t: "Para qué sirve", body: <ul className="space-y-2">
    <Li><b>Hace verificable el objetivo:</b> sin resultado clave, el cumplimiento queda a juicio de cada quien.</Li>
    <Li><b>Ordena las iniciativas:</b> cada iniciativa se vincula al resultado clave que mueve; una iniciativa sin resultado clave no se puede priorizar.</Li>
    <Li><b>Da el pulso trimestral:</b> es lo que se mira en los cierres de trimestre para decidir seguir, ajustar o parar.</Li>
    <Li><b>Asigna responsabilidad:</b> un dueño del dato y una fuente evitan discusiones sobre la cifra.</Li>
  </ul> },
  { k: "Estructura", t: "Qué debe tener", body: <>
    <div className="grid gap-2 sm:grid-cols-2">
      {[["Nombre con cifra", "«OTIF ≥ 95 % al cierre de 2027», no «mejorar el OTIF»."], ["Línea base", "el valor con que cerró 2026 (o el último dato disponible), con su fecha de corte."], ["Meta", "el valor a alcanzar, con la unidad y el sentido (mayor o menor es mejor)."], ["Plazo", "trimestre o año en que se mide el cumplimiento."], ["Dueño", "quien responde por el dato y por el resultado."], ["Definición y fórmula", "cómo se calcula y de qué fuente sale, para que cualquiera lo reproduzca."]].map(([a, b]) => (
        <div key={a} className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[12px] font-bold uppercase tracking-wider text-faint">{a}</div><div className="text-[12.5px] leading-snug text-ink">{b}</div></div>
      ))}
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Bien>«Participación de mercado en valores del 3,1 % al 3,4 % a diciembre de 2027 (fuente: auditoría de mercado).»</Bien>
      <Mal>«Implementar el nuevo CRM comercial.» (es una iniciativa, no un resultado)</Mal>
    </div>
  </> },
  { k: "Tips", t: "Para formularlos bien", body: <ul className="space-y-2">
    <Li><b>Resultado, no tarea:</b> si se puede «terminar» un martes, es una iniciativa.</Li>
    <Li><b>Ambicioso y posible:</b> la meta exige esfuerzo pero es creíble con la capacidad instalada; la brecha entre base y meta debe ser visible.</Li>
    <Li><b>Medible con datos que existen:</b> si hay que inventar la medición, primero se crea el dato (y eso puede ser una iniciativa).</Li>
    <Li><b>Pocos y complementarios:</b> de 2 a 4 por objetivo; que cubran resultado, calidad y sostenibilidad, no cuatro versiones de lo mismo.</Li>
    <Li><b>Evita métricas de vanidad:</b> asistentes, horas, número de reuniones; prefiere efecto en el cliente, el proceso o el resultado financiero.</Li>
    <Li><b>Cada resultado clave con al menos una iniciativa:</b> si nadie hace nada distinto, la cifra no se moverá.</Li>
  </ul> },
  { k: "Errores", t: "Errores frecuentes", body: <ul className="space-y-2">
    <Li>Resultados clave sin línea base: no se puede saber si hubo avance.</Li>
    <Li>Meta sin plazo o con plazo vago («en el mediano plazo»).</Li>
    <Li>Dueño colectivo («el comité») o inexistente.</Li>
    <Li>Resultado clave que repite el objetivo con otras palabras.</Li>
    <Li>Más de cinco resultados clave: ya no es foco, es un tablero.</Li>
  </ul> },
];

const INICIATIVAS: Lamina[] = [
  { k: "Qué es", t: "Una iniciativa es lo que se hace para mover un resultado clave", body: <>
    <p className="text-[14px] leading-relaxed text-ink">Una <b>iniciativa</b> es un conjunto acotado de trabajo (proyecto, programa, cambio de proceso, lanzamiento) con inicio y fin, un responsable y recursos, que existe para <b>mover un resultado clave</b> de un objetivo directivo. Si no mueve ningún resultado clave, no es estratégica: es operación o es una idea sin dueño.</p>
    <p className="mt-3 text-[13px] leading-relaxed text-muted">En el marco 4Shine Empresas es el eslabón entre la <b>Dirección</b> (prioridades, objetivos, KR) y la <b>Ejecución</b> (portafolio, cascada trimestral y seguimiento). Cada iniciativa declara además la <b>capacidad que instala</b> en la organización.</p>
  </> },
  { k: "Función", t: "Para qué sirve", body: <ul className="space-y-2">
    <Li><b>Convierte el resultado en acción:</b> el KR dice cuánto; la iniciativa dice cómo, quién y cuándo.</Li>
    <Li><b>Entra a la priorización:</b> solo una iniciativa vinculada a un resultado clave completo se puede calificar con la matriz y decidir en el portafolio.</Li>
    <Li><b>Ordena el esfuerzo:</b> máximo dos iniciativas por resultado clave obliga a elegir las que de verdad lo alteran.</Li>
    <Li><b>Baja a la cascada trimestral:</b> sus hitos, responsable y fechas alimentan las metas de cada área por trimestre.</Li>
  </ul> },
  { k: "Estructura", t: "Qué debe tener", body: <>
    <div className="grid gap-2 sm:grid-cols-2">
      {[["Nombre", "un sustantivo de entrega, no un verbo: «Call center para droguerías», no «Implementar call center»."], ["Qué logra", "el cambio concreto que deja instalado y cómo mueve el resultado clave."], ["Resultado clave que mueve", "uno principal; si mueve varios, se elige el que más depende de ella."], ["Responsable", "un área y una persona que responde; el sponsor es el de la prioridad."], ["Inicio y fin", "trimestre de inicio y de cierre; una iniciativa sin fin es operación."], ["Capacidad que instala", "la dimensión del mapa 4Shine que fortalece (p. ej. Accountability, Cadencia, Tecnología)."], ["Recursos y presupuesto", "lo que necesita en personas, dinero y tiempo, aunque sea estimado."], ["Alcance", "qué incluye y qué queda fuera; evita la iniciativa paraguas."]].map(([a, b]) => (
        <div key={a} className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[12px] font-bold uppercase tracking-wider text-faint">{a}</div><div className="text-[12.5px] leading-snug text-ink">{b}</div></div>
      ))}
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Bien>«Modelo de cobertura omnicanal del panel médico AAA y AA: diseño, piloto en dos regionales y despliegue nacional. Mueve la frecuencia de visita 5 de 6; Comercial; T1 a T3 2027; instala Cadencia de ejecución.»</Bien>
      <Mal>«Mejorar la relación con los médicos.» (sin entrega, sin KR, sin responsable ni fin: es un deseo, no una iniciativa)</Mal>
    </div>
  </> },
  { k: "Tips", t: "Para formularlas bien", body: <ul className="space-y-2">
    <Li><b>Entrega, no actividad continua:</b> si no se puede terminar, es un proceso; conviértelo en el proyecto que lo instala.</Li>
    <Li><b>Un KR principal:</b> si una iniciativa «mueve todo», probablemente no mueve nada; acótala.</Li>
    <Li><b>Pocas y decisivas:</b> de 1 a 2 por resultado clave; el portafolio decide cuáles van ahora, cuáles se preparan y cuáles se descartan.</Li>
    <Li><b>Con dueño y fecha desde el día uno:</b> sin responsable y trimestre de inicio no entra al portafolio.</Li>
    <Li><b>Declara la capacidad:</b> la iniciativa deja algo instalado (proceso, dato, tecnología, talento); nómbralo con la dimensión del mapa.</Li>
    <Li><b>Dimensiona antes de prometer:</b> recursos estimados y dependencias de otras áreas; eso alimenta la cascada trimestral.</Li>
    <Li><b>Evita duplicados:</b> dos iniciativas con la misma entrega en áreas distintas se fusionan o se diferencian por alcance.</Li>
  </ul> },
  { k: "Errores", t: "Errores frecuentes", body: <ul className="space-y-2">
    <Li>Iniciativa sin resultado clave: no se puede calificar ni decidir.</Li>
    <Li>Nombre con verbo («Implementar…», «Gestionar…»): describe tarea, no entrega.</Li>
    <Li>Iniciativa paraguas que agrupa cinco proyectos: no se puede priorizar ni cerrar.</Li>
    <Li>Más de dos iniciativas por KR: el esfuerzo se dispersa.</Li>
    <Li>Sin trimestre de inicio o de fin: no cabe en la cascada trimestral.</Li>
  </ul> },
];

export function AyudaMetodologica({ tema }: { tema: "objetivos" | "resultados-clave" | "iniciativas" }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const laminas = tema === "objetivos" ? OBJETIVOS : tema === "iniciativas" ? INICIATIVAS : KR;
  const titulo = tema === "objetivos" ? "Objetivos directivos · ayuda metodológica" : tema === "iniciativas" ? "Iniciativas · ayuda metodológica" : "Resultados clave · ayuda metodológica";
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") setI((x) => Math.min(laminas.length - 1, x + 1)); if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1)); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open, laminas.length]);
  const l = laminas[i];
  return (
    <>
      <button type="button" onClick={() => { setI(0); setOpen(true); }} className="btn-ghost btn-sm text-[12px]" title="Qué es, para qué sirve, cómo se estructura y cómo se formula"><BookOpen size={12} /> Ayuda metodológica</button>
      {open && (
        <Modal title={titulo} sub={`${i + 1} de ${laminas.length} · ${l.k}`} onClose={() => setOpen(false)} wide
          footer={<>
            <div className="mr-auto flex gap-1">{laminas.map((x, j) => <button key={x.k} type="button" onClick={() => setI(j)} aria-label={x.k} className={`h-2 w-2 rounded-full ${j === i ? "bg-cyan-deep" : "bg-line-strong"}`} />)}</div>
            <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="btn-ghost btn-sm text-[12px] disabled:opacity-40"><ArrowLeft size={12} /> Anterior</button>
            {i < laminas.length - 1 ? <button type="button" onClick={() => setI((x) => x + 1)} className="btn-primary btn-sm text-[12px]">Siguiente <ArrowRight size={12} /></button> : <button type="button" onClick={() => setOpen(false)} className="btn-primary btn-sm text-[12px]">Cerrar</button>}
          </>}>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-deep">{l.k}</div>
          <h3 className="mb-4 mt-1 text-[20px] font-extrabold leading-tight text-ink">{l.t}</h3>
          {l.body}
        </Modal>
      )}
    </>
  );
}

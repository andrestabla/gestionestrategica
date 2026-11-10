"use client";

// Ayuda metodológica tipo presentación: qué es, para qué sirve, cómo se estructura y cómo se formula un objetivo
// directivo o un resultado clave, según el marco 4Shine Empresas. Se abre desde un botón en la barra de cada sección.

import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui";
import { BookOpen, ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { CRITERIA, LEVEL_NAMES, TYPE_CRITERIA, DEFAULT_TYPE_RULE, consolidate, score, decisionCheck, typeOf, DECISIONS, type Evaluation, type Level, type TypeMark, type TypeRule } from "@/lib/priorizacion";
import { EvaluacionFocal, type EvaluacionGuardable } from "@/components/evaluacion-focal";
import { FRENTES, NIVEL_CAP, SEMAFORO } from "@/lib/capacidades";
import { ROL_AREA } from "@/lib/cascada";

type Lamina = { t: string; k: string; body: ReactNode };
const Bien = ({ children }: { children: ReactNode }) => <div className="flex items-start gap-2 rounded-xl px-3 py-2 text-[12.5px] leading-snug" style={{ background: "color-mix(in srgb, var(--ok) 10%, var(--surface))" }}><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-ok" /><span>{children}</span></div>;
const Mal = ({ children }: { children: ReactNode }) => <div className="flex items-start gap-2 rounded-xl px-3 py-2 text-[12.5px] leading-snug" style={{ background: "color-mix(in srgb, var(--bad) 9%, var(--surface))" }}><XCircle size={14} className="mt-0.5 shrink-0 text-bad" /><span>{children}</span></div>;
const Li = ({ children }: { children: ReactNode }) => <li className="flex gap-2 text-[13px] leading-relaxed text-ink"><span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-deep" /><span>{children}</span></li>;

/** Lámina común de cierre: quién hace qué en la etapa. En el acompañamiento el comité directivo define y decide,
    el advisor conduce el método y los responsables de área ejecutan su parte. */
const quienes = (etapa: string, comite: string, advisor: string, areas: string): Lamina => ({ k: "Quién hace qué", t: `Quién hace qué en ${etapa}`, body: <>
  <p className="text-[14px] leading-relaxed text-ink">En las sesiones de acompañamiento <b>el comité directivo es quien define</b>: la plataforma le da edición completa en esta etapa. El advisor conduce el método y las herramientas de IA; los responsables de área ejecutan y reportan lo suyo.</p>
  <div className="mt-4 grid gap-3 sm:grid-cols-3">
    {[["Comité directivo", comite, "var(--cyan-deep)"], ["Advisor", advisor, "var(--gold, #A87A14)"], ["Responsables de área", areas, "var(--ink-soft)"]].map(([t, d, c]) => (
      <div key={t} className="rounded-xl border border-line p-3.5" style={{ borderTopWidth: 3, borderTopColor: c }}>
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">{t}</div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink">{d}</p>
      </div>
    ))}
  </div>
  <p className="mt-4 text-[12.5px] leading-relaxed text-muted">Todo cambio queda en la auditoría con autor y fecha. El administrador de la plataforma y el líder de la empresa tienen la misma edición que el comité; el directivo de una empresa en otro modo (convención) solo lee.</p>
</> });

/** Lámina común: reglas de paso entre etapas. Lo que no cumple la condición se queda en su etapa (nada se borra)
    y pasa en cuanto se corrige; la plataforma lo avisa en la etapa siguiente y el servidor aplica la misma regla. */
type Etapa = "prioridades" | "objetivos" | "kr" | "iniciativas" | "priorizacion" | "portafolio" | "capacidades" | "cascada";
const PASOS: { de: string; a: string; regla: string; detalle: string; etapas: Etapa[] }[] = [
  { de: "Prioridades estratégicas", a: "Objetivos directivos", etapas: ["prioridades", "objetivos"],
    regla: "Todo objetivo nace dentro de una prioridad vigente y de un horizonte.",
    detalle: "Si una prioridad se elimina, sus objetivos no se borran: quedan sin prioridad y hay que reubicarlos o descartarlos." },
  { de: "Objetivos directivos", a: "Resultados clave", etapas: ["objetivos", "kr"],
    regla: "Pasa el objetivo vinculado a una prioridad vigente y que no esté descartado.",
    detalle: "Un objetivo sin prioridad o marcado «Descartado» se queda en Objetivos directivos; no admite resultados clave nuevos." },
  { de: "Resultados clave", a: "Iniciativas", etapas: ["kr", "iniciativas"],
    regla: "Recibe iniciativas el resultado clave completo: cifra, línea base, meta, unidad, dueño, plazo y definición con fórmula.",
    detalle: "La meta debe ser distinta de la base, salvo en los de sostenimiento («mejor si se mantiene»). Máximo dos iniciativas por resultado clave; cada iniciativa mueve de 1 a 3." },
  { de: "Iniciativas", a: "Priorización", etapas: ["iniciativas", "priorizacion"],
    regla: "Pasa la iniciativa vinculada al menos a un resultado clave que existe (puede mover hasta tres).",
    detalle: "Una iniciativa puede quedar momentáneamente sin resultado clave: espera en la columna de pendientes y no pasa. Una vez vinculada se puede calificar con la sesión de su prioridad abierta, aunque la validación la deje parcialmente alineada o le falten datos de formulación: eso aparece como «con pendientes» y no la frena." },
  { de: "Priorización", a: "Portafolio", etapas: ["priorizacion", "portafolio"],
    regla: "Entra al portafolio la iniciativa que pasó por priorización; la decisión de tiempo exige al menos una calificación.",
    detalle: "Implementar exige impacto consolidado de 3 o 4 y capacidad resuelta; renunciar exige motivo; las tácticas se transfieren al área." },
  { de: "Portafolio", a: "Capacidades para ejecutar", etapas: ["portafolio", "capacidades"],
    regla: "Se revisan las capacidades de las iniciativas con decisión «implementar» o «preparar».",
    detalle: "Backlog y renuncia no se revisan. Si el objetivo de la iniciativa se descarta, sale de la revisión." },
  { de: "Portafolio y capacidades", a: "Cascada trimestral", etapas: ["capacidades", "cascada"],
    regla: "Llegan a la cascada las iniciativas decididas; primero se declara la articulación entre áreas y después las metas.",
    detalle: "Una meta solo se registra en un área que participa en la articulación. Las brechas de capacidad no bloquean, pero se resuelven antes o en paralelo." },
];
const pasos = (actual: Etapa): Lamina => ({ k: "Reglas de paso", t: "Qué debe cumplirse para pasar de una etapa a la siguiente", body: <>
  <p className="text-[14px] leading-relaxed text-ink">La ruta es una cadena: cada etapa trabaja solo con lo que la anterior dejó bien formado. <b>Lo que no cumple la condición se queda en su etapa</b>; no se borra y pasa en cuanto se corrige. Resaltadas, las reglas que tocan esta etapa.</p>
  <ol className="mt-4 space-y-2">
    {PASOS.map((x, i) => { const on = x.etapas.includes(actual); return (
      <li key={i} className="rounded-xl border px-3.5 py-2.5" style={on ? { borderColor: "var(--cyan-deep)", background: "color-mix(in srgb, var(--cyan) 8%, var(--surface))" } : { borderColor: "var(--line)" }}>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-faint">
          <span className={on ? "text-cyan-deep" : ""}>{x.de}</span><ArrowRight size={11} /><span className={on ? "text-cyan-deep" : ""}>{x.a}</span>
        </div>
        <p className="mt-1 text-[13px] font-semibold leading-snug text-ink">{x.regla}</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{x.detalle}</p>
      </li>
    ); })}
  </ol>
  <p className="mt-4 text-[12.5px] leading-relaxed text-muted">La etapa siguiente avisa cuántos elementos se quedaron atrás y enlaza a donde se corrigen. El servidor aplica las mismas reglas, así que no se saltan por otra vía.</p>
</> });

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
  pasos("objetivos"),
  quienes("Objetivos directivos", "Escribe, edita y elimina los objetivos directivos de cada prioridad; decide la redacción final tras la validación.", "Conduce la sesión, corre la validación con IA (alineación con la prioridad, verbo de logro, indicador impulsor, solapes) y propone reformulaciones.", "Aportan la evidencia y la línea base 2026 de su área; no editan los objetivos."),
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
  pasos("kr"),
  quienes("Resultados clave", "Define, edita y elimina los resultados clave de cada objetivo: línea base, meta, unidad, dueño y fórmula.", "Valida cada KR con IA, cuida que haya de 2 a 3 por objetivo y que ninguno sea una iniciativa disfrazada.", "El dueño de cada KR reporta su valor en el ritmo acordado."),
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
      {[["Nombre", "un sustantivo de entrega, no un verbo: «Call center para droguerías», no «Implementar call center»."], ["Qué logra", "el cambio concreto que deja instalado y cómo mueve el resultado clave."], ["Resultado clave que mueve", "uno principal; si mueve varios, se elige el que más depende de ella. Puede quedar pendiente mientras el comité lo define: la iniciativa vuelve a la columna «Iniciativas sin resultado clave»."], ["Responsable", "un área y una persona que responde; el sponsor es el de la prioridad."], ["Inicio y fin", "trimestre de inicio y de cierre; una iniciativa sin fin es operación."], ["Capacidad que instala", "la dimensión del mapa 4Shine que fortalece (p. ej. Accountability, Cadencia, Tecnología)."], ["Recursos y presupuesto", "lo que necesita en personas, dinero y tiempo, aunque sea estimado. El presupuesto se registra en pesos (COP) o en dólares (USD), con puntos para separar los miles."], ["Alcance", "qué incluye y qué queda fuera; evita la iniciativa paraguas."]].map(([a, b]) => (
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
    <Li>Iniciativa sin resultado clave: puede quedar así un tiempo, pero no se puede calificar ni decidir hasta vincularla.</Li>
    <Li>Nombre con verbo («Implementar…», «Gestionar…»): describe tarea, no entrega.</Li>
    <Li>Iniciativa paraguas que agrupa cinco proyectos: no se puede priorizar ni cerrar.</Li>
    <Li>Más de dos iniciativas por KR: el esfuerzo se dispersa.</Li>
    <Li>Sin trimestre de inicio o de fin: no cabe en la cascada trimestral.</Li>
  </ul> },
  pasos("iniciativas"),
  quienes("Iniciativas", "Crea, edita y elimina iniciativas con sus ocho elementos y las vincula al resultado clave que mueven.", "Valida con IA los ocho elementos, el alcance y el nombre como entrega; vela por el máximo de dos iniciativas por KR.", "Proponen y completan las iniciativas de su área; el responsable asignado responde por su ejecución."),
];

const PORTAFOLIO: Lamina[] = [
  { k: "Qué es", t: "El portafolio es lo que la empresa decidió hacer, no lo que se le ocurrió", body: <>
    <p className="text-[14px] leading-relaxed text-ink">El <b>portafolio</b> es el conjunto de iniciativas que salieron de la priorización con una <b>decisión de tiempo</b>: ahora implementar, ahora preparar o validar, luego (backlog) o renunciar. Es el cierre de la cadena Dirección → Ejecución: de las prioridades a los objetivos, de los objetivos a los resultados clave, de ahí a las iniciativas calificadas y, por último, a la decisión de cuándo.</p>
    <p className="mt-3 text-[13px] leading-relaxed text-muted">La calificación dice cuánto vale una iniciativa; el portafolio dice cuándo se hace y con qué recursos. Lo que no tiene decisión no está en el portafolio: es inventario.</p>
  </> },
  { k: "Función", t: "Para qué sirve", body: <ul className="space-y-2">
    <Li><b>Concentra los recursos:</b> pocas iniciativas en «implementar», con dueño, presupuesto y fecha; el resto espera o se descarta de forma explícita.</Li>
    <Li><b>Hace visible la renuncia:</b> lo que queda en backlog o se descarta se comunica; nadie sigue trabajando en lo que la dirección no eligió.</Li>
    <Li><b>Alimenta la ejecución:</b> solo lo decidido pasa a Capacidades para ejecutar y a la cascada trimestral.</Li>
    <Li><b>Se lee por prioridad y por decisión:</b> cuántas iniciativas sostienen cada prioridad y en qué momento arrancan.</Li>
  </ul> },
  { k: "Decisión de tiempo", t: "Cuatro decisiones y sus condiciones", body: <>
    <div className="grid gap-2 sm:grid-cols-2">{DECISIONS.map((d) => <div key={d.key} className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[12px] font-bold text-ink">{d.label}</div><div className="mt-0.5 text-[12px] leading-snug text-ink-soft">{d.rule}</div></div>)}</div>
    <p className="mt-3 text-[12.5px] leading-relaxed text-muted">Implementar exige impacto consolidado de 3 o 4 y capacidad resuelta; preparar o validar exige al menos una calificación; renunciar exige motivo. Las tácticas (según la regla de tipo de la empresa) no compiten en el portafolio: se transfieren al área con responsable. Decide el comité directivo con el advisor; queda autor, fecha y sustento.</p>
  </> },
  { k: "Lectura", t: "Cómo se lee el portafolio", body: <ul className="space-y-2">
    <Li><b>Por prioridad:</b> cada prioridad debería tener de 2 a 4 iniciativas en «implementar» o «preparar». Una prioridad sin iniciativas decididas es una apuesta sin brazos; una con diez es dispersión.</Li>
    <Li><b>Por decisión:</b> el total en «implementar» cabe en la capacidad real del año (personas y presupuesto). Si no cabe, algo pasa a «preparar» o a backlog.</Li>
    <Li><b>Por resultado clave:</b> cada KR con al menos una iniciativa decidida; un KR sin iniciativa es una meta sin plan.</Li>
    <Li><b>Bajo consenso y capacidad primero:</b> las señales de la priorización se revisan antes de decidir «implementar».</Li>
    <Li><b>Sustento:</b> cada decisión dice por qué ahora, por qué luego o por qué no; es lo que se comunica al equipo.</Li>
  </ul> },
  { k: "Tips", t: "Para decidir bien", body: <ul className="space-y-2">
    <Li><b>Decide en una sesión,</b> con el ranking a la vista y el presupuesto del año: no iniciativa por iniciativa en días distintos.</Li>
    <Li><b>«Preparar» no es «implementar despacio»:</b> es una etapa acotada con evidencia esperada, responsable y recursos propios; termina con una decisión.</Li>
    <Li><b>Backlog con condición:</b> «cuando el CRM esté integrado», «cuando cierre la certificación»; sin condición es un cajón.</Li>
    <Li><b>Renunciar es una decisión, no un olvido:</b> con motivo y comunicada al dueño.</Li>
    <Li><b>Revisa el portafolio cada trimestre</b> con el cierre de la cascada: lo que no avanzó cambia de decisión o de dueño.</Li>
  </ul> },
  { k: "Ejemplo", t: "Un portafolio decidido", body: <>
    <p className="text-[12.5px] leading-relaxed text-muted">Laboratorios Cordillera (ficticia), prioridad «Disponibilidad garantizada del portafolio esencial», cuatro iniciativas calificadas.</p>
    <div className="mt-3 overflow-x-auto rounded-xl border border-line"><table className="w-full text-[12px]"><thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Iniciativa</th><th className="px-2 py-2">Puntaje</th><th className="px-2 py-2">Decisión</th><th className="px-3 py-2">Sustento</th></tr></thead><tbody>
      {[["Plan maestro integrado (demanda, capacidad, materiales)", "85", "Ahora: implementar", "Mueve el fill rate del 91 % al 96 %; capacidad confirmada en planeación; retrasarlo compromete el KR del año."], ["Integración LIMS–plan maestro", "72", "Ahora: preparar o validar", "Piloto de tres meses con dos moléculas para comprobar que la liberación baja de 9 a 6 días; TIC con presupuesto propio."], ["Centro de distribución regional", "68", "Luego: backlog", "Depende de alcanzar el 96 % de fill rate con la red actual; se revisa en el cierre del T2."], ["Maquila para terceros en líneas esenciales", "55", "Renunciar", "Usa la capacidad que la promesa de disponibilidad necesita; contradice la renuncia declarada en la prioridad."]].map((r) => <tr key={r[0]} className="border-t border-line align-top">{r.map((c, i) => <td key={i} className={`px-3 py-2 leading-snug ${i === 0 ? "font-semibold text-ink" : i === 1 ? "num font-bold text-ink" : "text-ink-soft"}`}>{c}</td>)}</tr>)}
    </tbody></table></div>
    <p className="mt-3 text-[12.5px] leading-relaxed text-muted">Lo que hace bien: dos iniciativas sostienen la prioridad ahora, una espera con condición y una se descarta con motivo. El total en «implementar» cabe en el presupuesto del año, y las dos decididas pasan a Capacidades para ejecutar y a la cascada.</p>
  </> },
  { k: "En la plataforma", t: "Cómo se usa aquí", body: <ul className="space-y-2">
    <Li>El portafolio parte del 100 % de las iniciativas; el ranking consolidado de Priorización se superpone cuando llega. Filtros por objetivo, sponsor, prioridad y decisión; exportación a CSV.</Li>
    <Li>La decisión de tiempo se registra en la ficha de cada iniciativa (comité directivo o advisor), con sustento; las condiciones de cada decisión se verifican contra el consolidado.</Li>
    <Li>Resumen por prioridad y decisión, y lista ordenada por puntaje consolidado dentro de cada horizonte.</Li>
    <Li>Lo decidido en «implementar» o «preparar» entra a <b>Capacidades para ejecutar</b> y al árbol de la <b>Cascada trimestral</b>, donde cada iniciativa se articula entre áreas ({Object.values(ROL_AREA).join(" y ").toLowerCase()}).</Li>
  </ul> },
  pasos("portafolio"),
  quienes("Portafolio", "Decide el tiempo de cada iniciativa (implementar, preparar o validar, backlog, renunciar) con sustento, a partir del consolidado de la priorización.", "Prepara la sesión, muestra el consolidado y las condiciones de cada decisión, y registra las decisiones que el comité toma en la mesa.", "Reciben las iniciativas tácticas transferidas a su área y las decididas para ejecutarlas."),
];

const CASCADA: Lamina[] = [
  { k: "Qué es", t: "Bajar las prioridades a metas trimestrales de cada área", body: <>
    <p className="text-[14px] leading-relaxed text-ink">La <b>cascada y plan trimestral</b> (F04, capacidad de Ejecución) convierte el portafolio en compromisos de corto plazo: qué logra cada área este trimestre para mover un resultado clave, con qué criterio de éxito, con qué hitos y qué necesita de otras áreas. Es el puente entre la estrategia decidida y el trabajo de la semana.</p>
    <p className="mt-3 text-[13px] leading-relaxed text-muted">Sin cascada, el portafolio se queda en intención: cada área sigue con su agenda. Con cascada, el trimestre tiene un número por área, una fecha y un dueño, y el cierre dice cuánto se cumplió y qué se aprendió.</p>
  </> },
  { k: "Función", t: "Para qué sirve", body: <ul className="space-y-2">
    <Li><b>Traduce:</b> de la iniciativa (anual) a la meta del trimestre (qué se entrega en doce semanas).</Li>
    <Li><b>Hace visible la interdependencia:</b> qué necesita un área de otra, con fecha, antes de que falle.</Li>
    <Li><b>Ordena el ritmo:</b> planear, ejecutar, cerrar y aprender cada trimestre, con cumplimiento medido.</Li>
    <Li><b>Instala capacidades antes de exigir resultado:</b> las brechas de «Capacidades para ejecutar» entran como hitos previos.</Li>
  </ul> },
  { k: "Árbol", t: "Todo se organiza en un árbol de siete niveles", body: <>
    <p className="text-[13px] leading-relaxed text-ink">La cascada se lee de arriba abajo: <b>Prioridad → Objetivo → Resultado clave → Iniciativa → Unidad o área (con su rol y su prioridad dentro de la iniciativa) → Persona o equipo → Meta por trimestre</b>. Nada cuelga en el aire: cada meta del trimestre pertenece a un área que participa en una iniciativa, que mueve un resultado clave de un objetivo de una prioridad.</p>
    <div className="mt-3 rounded-xl bg-surface-2 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-soft">
      <b className="text-ink">Premisa:</b> ninguna iniciativa es de una sola área. Cada iniciativa es trabajo articulado e interdependiente entre unidades. Por eso, antes de las metas, se declara la <b className="text-ink">articulación</b>: qué áreas participan, cuál lidera (una sola), con qué prioridad (1 = la que más aporta), quién la ejecuta (persona o equipo) y, sobre todo, <b className="text-ink">qué debe hacer cada área</b>: una contribución concreta con entregable y fecha.
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Bien>«Modelo omnicanal del panel AAA y AA · Promoción médica lidera (1): ejecutar el ciclo de visita presencial y virtual con 22 visitadores · TIC contribuye (2): integrar el CRM con la plataforma de contenido y depurar el maestro de médicos, entrega 31 de marzo · Marketing contribuye (3): producir y aprobar doce piezas de contenido científico por trimestre.»</Bien>
      <Mal>«Modelo omnicanal · Promoción médica.» (una sola área y sin contribuciones: la interdependencia con TIC y marketing queda invisible hasta que falla)</Mal>
    </div>
  </> },
  { k: "Estructura", t: "Qué debe tener una meta trimestral", body: <>
    <div className="grid gap-2 sm:grid-cols-2">
      {[["Trimestre y área", "un trimestre (2027-T1) y el área responsable; una meta pertenece a una sola área, declarada en la articulación de su iniciativa."], ["Persona o equipo", "quién responde dentro del área: una persona del catálogo o un equipo."], ["Prioridad, objetivo y KR", "de qué prioridad cuelga, a qué objetivo directivo aporta y qué resultado clave mueve."], ["Iniciativa", "la iniciativa del portafolio que la meta ejecuta (implementar o preparar)."], ["Meta", "qué logra el área este trimestre, en una frase con cifra: «cubrir el 40 % del panel AAA y AA»."], ["Criterio de éxito", "cómo sabremos que se cumplió: el dato, la fuente y el corte."], ["Hitos", "de 2 a 4 entregables con responsable y fecha; cada uno con estado (pendiente, en curso, hecho)."], ["Dependencias", "qué necesita de otras áreas y para cuándo: es el aviso temprano del trimestre."], ["Cierre", "al terminar el trimestre: cumplimiento en porcentaje y el aprendizaje que cambia el siguiente plan."]].map(([a, b]) => (
        <div key={a} className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[12px] font-bold uppercase tracking-wider text-faint">{a}</div><div className="text-[12.5px] leading-snug text-ink">{b}</div></div>
      ))}
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Bien>«2027-T1 · Promoción médica · Cubrir con el modelo omnicanal el 40 % del panel AAA y AA. Criterio: 40 % del panel con un contacto presencial y uno digital en el CRM al cierre de marzo. Hitos: segmentación aprobada (31-ene), procedimiento de visita virtual aprobado (28-feb), 22 visitadores formados (15-mar). Depende de TIC: integración CRM–contenido en marzo.»</Bien>
      <Mal>«Avanzar en la omnicanalidad.» (sin cifra, sin criterio, sin hitos ni dependencias: no se puede cerrar)</Mal>
    </div>
  </> },
  { k: "Ciclo", t: "Planear, ejecutar, cerrar y aprender", body: <ul className="space-y-2">
    <Li><b>Planear (semana 1):</b> cada área registra sus metas del trimestre a partir del portafolio («Proponer desde el portafolio» crea una por iniciativa en su trimestre de inicio); el comité revisa criterios y dependencias.</Li>
    <Li><b>Ejecutar (semanas 2 a 11):</b> los hitos cambian de estado; las dependencias se piden con fecha; una meta en riesgo se escala en la reunión mensual.</Li>
    <Li><b>Cerrar (semana 12):</b> cada meta registra su cumplimiento (0 a 100 %) y un aprendizaje; el ciclo muestra el cumplimiento promedio y los aprendizajes del trimestre.</Li>
    <Li><b>Aprender:</b> lo aprendido ajusta las metas del trimestre siguiente, no solo el discurso.</Li>
  </ul> },
  { k: "Tips", t: "Para que la cascada funcione", body: <ul className="space-y-2">
    <Li><b>Pocas metas por área:</b> de 1 a 3 por trimestre; más es lista de tareas.</Li>
    <Li><b>Cifra y fecha en la meta,</b> no en el hito: el hito es el camino, la meta es el resultado.</Li>
    <Li><b>El criterio de éxito nombra la fuente del dato:</b> CRM, ERP, acta; si no hay fuente, no hay cierre.</Li>
    <Li><b>Las dependencias se escriben desde quien necesita,</b> con el área que entrega y la fecha; se revisan en el ciclo.</Li>
    <Li><b>Brechas de capacidad primero:</b> si Capacidades marcó un frente en 1, el hito que lo resuelve va antes que el hito de resultado.</Li>
    <Li><b>Cierre honesto:</b> un 60 % con aprendizaje vale más que un 100 % sin dato.</Li>
  </ul> },
  { k: "Ejemplo", t: "Un trimestre de una área, de principio a fin", body: <>
    <p className="text-[12.5px] leading-relaxed text-muted">Laboratorios Cordillera (ficticia), Dirección Técnica, 2027-T1, prioridad Disciplina Operacional, objetivo «Obtener la certificación BPM», KR «Hitos del plan de certificación cumplidos a tiempo: de 35 % a 100 %», iniciativa «Plan de certificación BPM».</p>
    <div className="mt-3 overflow-x-auto rounded-xl border border-line"><table className="w-full text-[12px]"><tbody>
      {[["Meta", "Cerrar los hallazgos abiertos de BPM y completar las validaciones pendientes."], ["Criterio de éxito", "0 hallazgos abiertos en el sistema de calidad y 100 % de las validaciones del plan con informe aprobado al 31 de marzo."], ["Hitos", "Plan de cierre con responsables (20-ene, hecho) · Validaciones de limpieza y procesos (15-mar, en curso) · Informes aprobados por calidad (31-mar, pendiente)."], ["Depende de", "Compras: repuestos del equipo de limpieza (15-feb). Operaciones: ventana de parada para la validación (1 a 5 de marzo)."], ["Cierre", "Cumplimiento 85 %: quedaron dos informes por aprobar. Aprendizaje: la ventana de parada se pide con seis semanas, no con dos; entra como regla del T2."]].map(([a, b]) => <tr key={a} className="border-t border-line align-top first:border-t-0"><td className="w-[150px] px-3 py-2 font-semibold text-ink">{a}</td><td className="px-3 py-2 leading-snug text-ink-soft">{b}</td></tr>)}
    </tbody></table></div>
  </> },
  { k: "En la plataforma", t: "Cómo se usa aquí", body: <ul className="space-y-2">
    <Li><b>Árbol de la cascada</b> (vista principal): las siete capas plegables por prioridad y filtrables por área, con las metas de cada área en columnas T1 a T4. Entran las iniciativas con decisión «implementar» o «preparar», las articuladas y las que ya tienen metas.</Li>
    <Li><b>Articular áreas</b> en cada iniciativa (comité directivo, advisor o responsable del área dueña): áreas, rol, prioridad, persona o equipo, qué debe hacer y entrega. <b>Articular áreas con IA</b> (advisor): una sola acción que propone la articulación de todas las iniciativas sin articular; después se edita.</Li>
    <Li><b>Regla:</b> una meta de una iniciativa solo se registra en un área declarada en su articulación; así ninguna queda fuera del árbol.</Li>
    <Li><b>Proponer metas desde el portafolio</b> (comité directivo o advisor): crea una meta por iniciativa articulada y por área que participa, en su trimestre de inicio, con la contribución del área como meta; después cada área completa criterio, hitos y dependencias.</Li>
    <Li><b>Nueva meta</b> (comité directivo, advisor y responsables de área): una meta por área y trimestre, con prioridad, objetivo, KR e iniciativa.</Li>
    <Li><b>Ciclo del trimestre:</b> metas, áreas, hitos hechos, dependencias y, al cerrar, el cumplimiento promedio y los aprendizajes.</Li>
    <Li><b>Interdependencias:</b> la vista de quién necesita qué de quién en el trimestre, para la reunión mensual.</Li>
    <Li><b>Cierre:</b> cada meta se cierra con su porcentaje y su aprendizaje; el estado queda en cumplida, parcial o no cumplida.</Li>
  </ul> },
  pasos("cascada"),
  quienes("Cascada y plan trimestral", "Articula las áreas de cada iniciativa (quién lidera, quién contribuye, qué debe hacer cada una) y crea, edita o elimina las metas trimestrales.", "Propone la articulación con IA de todas las iniciativas en una sola acción y propone las metas desde el portafolio; después el comité y las áreas las afinan.", "Cada responsable registra y actualiza las metas, hitos y dependencias de su propia área, y cierra el trimestre."),
];

const CAPACIDADES: Lamina[] = [
  { k: "Qué es", t: "Saber si la empresa puede ejecutar lo que decidió", body: <>
    <p className="text-[14px] leading-relaxed text-ink">Con el portafolio decidido, cada iniciativa en <b>implementar</b> o <b>preparar</b> se recorre con un checklist de cinco frentes para reconocer si la <b>capacidad de ejecutarla está instalada</b> o qué haría falta. No califica la iniciativa (eso lo hizo la priorización): califica a la empresa frente a esa iniciativa.</p>
    <p className="mt-3 text-[13px] leading-relaxed text-muted">La pregunta de fondo es una sola: si arrancamos el lunes, ¿quién la hace, con qué proceso, con qué procedimiento, con qué conocimiento y con qué tecnología? Donde la respuesta es «nadie», «ninguno» o «a medias», hay una brecha que se resuelve antes o en paralelo.</p>
  </> },
  { k: "Los cinco frentes", t: "Qué comprueba cada frente", body: <>
    <div className="grid gap-2 sm:grid-cols-2">
      {FRENTES.map((f) => <div key={f.key} className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[12px] font-bold uppercase tracking-wider text-faint">{f.name}</div><div className="text-[12.5px] leading-snug text-ink">{f.que}</div><ul className="mt-1.5 space-y-0.5">{f.items.map((i) => <li key={i.code} className="text-[12px] leading-snug text-ink-soft"><span className="num font-bold text-cyan-deep">{i.code}</span> {i.texto}</li>)}</ul></div>)}
    </div>
    <p className="mt-3 text-[12.5px] leading-relaxed text-muted">Cada afirmación trae una pregunta guía y la descripción de sus tres niveles, para calificar con criterio y no en abstracto. Los frentes son fijos; las afirmaciones se pueden personalizar por iniciativa.</p>
  </> },
  { k: "Niveles", t: "Tres niveles, por la realidad de hoy", body: <>
    <div className="grid gap-2 sm:grid-cols-3">
      {([1, 2, 3] as const).map((n) => <div key={n} className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="num text-[13px] font-extrabold text-ink">{n} · {NIVEL_CAP[n]}</div><div className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{n === 1 ? "Habría que crearla desde cero: no hay responsable, proceso, documento, competencia o sistema." : n === 2 ? "Existe con vacíos conocidos: se puede arrancar mientras se cierran, con responsable y fecha." : "Está, se usa y se verifica. Se demuestra con un hecho, no con una intención."}</div></div>)}
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Bien>«Tecnología · datos: 2 parcial. El maestro de clientes tiene el 30 % de los médicos sin especialidad; TI depura en T1 con dueño en marketing médico.»</Bien>
      <Mal>«Tecnología · datos: 3 instalada, porque vamos a contratar la depuración.» (califica la intención, no la realidad)</Mal>
    </div>
  </> },
  { k: "Lectura", t: "Del frente a la iniciativa", body: <ul className="space-y-2">
    <Li><b>Por frente:</b> el nivel más bajo de sus afirmaciones. Lo que falta frena todo el frente: un equipo sin dedicación anula al responsable con autoridad.</Li>
    <Li><b>Semáforo de la iniciativa:</b> {SEMAFORO.lista.label.toLowerCase()} (los cinco frentes en 3); {SEMAFORO.ajustes.label.toLowerCase()} (ningún frente en 1, alguno en 2); {SEMAFORO.brechas.label.toLowerCase()} (al menos un frente en 1).</Li>
    <Li><b>Qué haría falta:</b> obligatorio en cada frente no instalado, en concreto: qué, quién, cuándo. «Mejorar el proceso» no sirve; «documentar el procedimiento de liberación de lote con calidad, antes de mar-2027» sí.</Li>
    <Li><b>Qué hacer:</b> una brecha crítica se resuelve antes de arrancar, como hito previo en la cascada trimestral o como iniciativa habilitante; un ajuste se programa en paralelo con responsable y fecha.</Li>
  </ul> },
  { k: "Ejemplo", t: "Una iniciativa recorrida de principio a fin", body: <>
    <p className="text-[12.5px] leading-relaxed text-muted">Laboratorios Cordillera (ficticia). Iniciativa «Modelo de cobertura omnicanal del panel médico AAA y AA», decisión implementar, responsable marketing médico, presupuesto aprobado.</p>
    <div className="mt-3 overflow-x-auto rounded-xl border border-line"><table className="w-full text-[12px]"><thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Frente</th><th className="px-2 py-2">Nivel</th><th className="px-3 py-2">Por qué</th><th className="px-3 py-2">Qué haría falta</th></tr></thead><tbody>
      {[["Unidad", "3", "Dirección de marketing médico con autoridad sobre el presupuesto; equipo de 4 con dedicación; acuerdos con fuerza de ventas y TI firmados.", "—"], ["Proceso", "2", "El proceso de visita está definido y medido; el de contenido digital existe de hecho, sin dueño ni indicador.", "Nombrar dueño del proceso de contenido científico y definir 2 indicadores (publicaciones aprobadas, consumo por médico); marketing médico; ene-2027."], ["Procedimiento", "2", "Guion de visita presencial vigente; el de visita virtual no está documentado ni aprobado por asuntos regulatorios.", "Documentar y aprobar el procedimiento de visita virtual con regulatorio; feb-2027."], ["Conocimiento", "2", "Los visitadores dominan la visita presencial; 6 de 22 han hecho visita virtual; el conocimiento de la plataforma está en una persona.", "Plan de formación en visita virtual para 22 visitadores (T1) y segundo administrador de la plataforma formado; talento y TI; mar-2027."], ["Tecnología", "1", "El CRM no está integrado con la plataforma de contenido: el registro de contactos es manual y el dato de frecuencia no es confiable.", "Integración CRM–plataforma con el proveedor ya contratado y depuración del maestro de médicos; TI; entrega mar-2027. Hasta entonces, no se mide el KR con el dato del CRM."]].map((r) => <tr key={r[0]} className="border-t border-line align-top">{r.map((c, i) => <td key={i} className={`px-3 py-2 leading-snug ${i === 0 ? "font-semibold text-ink" : i === 1 ? "num font-bold text-ink" : "text-ink-soft"}`}>{c}</td>)}</tr>)}
    </tbody></table></div>
    <p className="mt-3 text-[12.5px] leading-relaxed text-muted">Semáforo: <b>con brechas críticas</b>, por tecnología en 1. Decisión que sigue: la integración CRM–plataforma entra como hito previo en la cascada del T1 de 2027 y la iniciativa arranca en T2; los ajustes de proceso, procedimiento y conocimiento se programan en paralelo con responsable y fecha.</p>
  </> },
  { k: "En la plataforma", t: "Cómo se usa aquí", body: <ul className="space-y-2">
    <Li>Entran solo las iniciativas con decisión <b>implementar</b> o <b>preparar</b> en el portafolio.</Li>
    <Li><b>Personalizar con IA</b> (advisor o administrador): el modelo adapta las afirmaciones, las preguntas guía y los niveles a la iniciativa y a la empresa, con todo el contexto cargado. Los frentes no cambian. Si se personaliza después de una revisión, la revisión queda marcada para hacerse de nuevo.</Li>
    <Li><b>Revisar</b> (comité directivo, advisor, sponsor de la prioridad o responsable de la iniciativa): a pantalla completa, una afirmación por paso, con «Lectura inicial con IA» opcional que propone niveles y justificaciones para confirmar o corregir.</Li>
    <Li>El resultado queda registrado con autor y fecha; el listado muestra el semáforo y las brechas de cada iniciativa, y el detalle enlaza con la cascada trimestral para programar lo que falta.</Li>
  </ul> },
  pasos("capacidades"),
  quienes("Capacidades para ejecutar", "Revisa el checklist de cualquier iniciativa decidida: nivel por afirmación, qué haría falta por frente y notas.", "Personaliza los checklists con IA (solo advisor o administrador) y pide la lectura inicial con IA que el revisor confirma o corrige.", "El responsable de la iniciativa y el sponsor de su prioridad revisan la suya."),
];

const PRIORIDADES: Lamina[] = [
  { k: "Qué es", t: "Una prioridad estratégica es una apuesta del ciclo, no un área", body: <>
    <p className="text-[14px] leading-relaxed text-ink">Una <b>prioridad estratégica</b> es una de las pocas apuestas (de 3 a 5) en las que la empresa concentra su esfuerzo durante el ciclo de 3 a 5 años para avanzar hacia su <b>meta ambiciosa</b>. Sale de la estrategia en una página: propósito, visión de futuro y meta con métrica, cifra y fecha; dónde jugamos y dónde no; promesas diferenciadoras.</p>
    <p className="mt-3 text-[13px] leading-relaxed text-muted">En el marco 4Shine Empresas pertenece a la capacidad de <b>Dirección</b> (F01 · Estrategia en una página): cada prioridad tiene dueño, resultado esperado y nombra una <b>renuncia</b>, lo que la empresa deja de hacer para sostenerla.</p>
  </> },
  { k: "Función", t: "Para qué sirve", body: <ul className="space-y-2">
    <Li><b>Concentra:</b> pocas apuestas con recursos reales, en lugar de una lista de deseos por área.</Li>
    <Li><b>Es el hilo conductor:</b> cada objetivo directivo, resultado clave, iniciativa y meta trimestral cuelga de una prioridad; nada entra al portafolio sin ella.</Li>
    <Li><b>Hace explícitas las renuncias:</b> iniciativas eliminadas, aplazadas o no iniciadas, comunicadas al equipo.</Li>
    <Li><b>Ordena la rendición de cuentas:</b> un sponsor directivo responde por cada prioridad en el ritmo trimestral.</Li>
  </ul> },
  { k: "Estructura", t: "Qué debe tener", body: <>
    <div className="grid gap-2 sm:grid-cols-2">
      {[["Nombre", "corto y reconocible, con intención: «Excelencia comercial», «Disciplina operacional»; no el nombre de un área."], ["Resultado esperado del ciclo", "qué queda logrado al cierre del ciclo, conectado con la meta ambiciosa."], ["Indicador que la mide", "de 1 a 3 medidas del avance de la apuesta; de ellas se derivan los indicadores impulsores de los objetivos."], ["Sponsor", "un directivo que responde por ella (no el gerente general para todas)."], ["Descripción o tesis", "por qué esta apuesta: dónde juega la empresa, qué promesa diferenciadora sostiene."], ["Renuncia", "lo que se deja de hacer para sostenerla: segmentos, proyectos o actividades que salen."]].map(([a, b]) => (
        <div key={a} className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[12px] font-bold uppercase tracking-wider text-faint">{a}</div><div className="text-[12.5px] leading-snug text-ink">{b}</div></div>
      ))}
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Bien>«Excelencia comercial: consolidar la cobertura y la codificación en los canales prioritarios, medida por participación de mercado y rotación en retail; sponsor Comercial; renunciamos a atender canales de bajo volumen sin plan.»</Bien>
      <Mal>«Finanzas.» (es un área, no una apuesta: no dice qué cambia, con qué medida, ni a qué se renuncia)</Mal>
    </div>
  </> },
  { k: "Tips", t: "Para definirlas bien", body: <ul className="space-y-2">
    <Li><b>De 3 a 5:</b> más prioridades diluyen el foco; si todo es prioritario, nada lo es.</Li>
    <Li><b>Apuestas, no áreas:</b> si la lista coincide con el organigrama, no hay estrategia sino presupuesto.</Li>
    <Li><b>Conectadas con la meta y con el «dónde jugamos»:</b> cada una explica cómo acerca la meta ambiciosa en el mercado y el cliente elegidos.</Li>
    <Li><b>Cada una nombra una renuncia concreta:</b> no genérica («ser más eficientes») sino verificable («salimos del canal X»).</Li>
    <Li><b>Sin solapamientos:</b> dos prioridades que persiguen el mismo resultado se funden o se diferencian por alcance.</Li>
    <Li><b>Con el lenguaje del negocio:</b> mercado, canal, producto, planta, regulación.</Li>
    <Li><b>Se renuevan en cada ciclo</b> y se revisan una vez al año con acta: asistentes, cambios acordados, versión.</Li>
  </ul> },
  { k: "Ejemplo completo", t: "Un ciclo de prioridades de principio a fin", body: <>
    <p className="text-[12.5px] leading-relaxed text-muted">Andina Suministros, empresa ficticia de 60 personas que distribuye suministros industriales (el mismo ejemplo del marco). Primero el contexto de su estrategia en una página; después, sus cuatro prioridades del ciclo 2027-2029.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      {[["Meta ambiciosa", "Ventas de $ 48.000 millones en 2029 (hoy $ 31.000 millones), con margen operacional ≥ 9 %."], ["Dónde jugamos", "Plantas y talleres industriales de la región Caribe y Antioquia; no jugamos en consumo masivo ni en licitaciones públicas de bajo margen."], ["Promesa diferenciadora", "Entrega completa en 24 horas en las 15 referencias críticas de cada cliente, medida por OTIF."]].map(([a, b]) => (
        <div key={a} className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[12px] font-bold uppercase tracking-wider text-faint">{a}</div><div className="text-[12.5px] leading-snug text-ink">{b}</div></div>
      ))}
    </div>
    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-[12px]">
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-3 py-2">N.º</th><th className="px-3 py-2">Prioridad</th><th className="px-3 py-2">Resultado esperado del ciclo</th><th className="px-3 py-2">Indicador que la mide</th><th className="px-3 py-2">Sponsor</th><th className="px-3 py-2">Lo que dejamos de hacer</th></tr></thead>
        <tbody>
          {[
            ["1", "Crecimiento en cuentas industriales", "Duplicar la facturación en plantas de más de 200 empleados en la región Caribe y Antioquia.", "Ventas en cuentas industriales · participación en las 50 plantas objetivo", "Gerencia comercial", "Salimos de los clientes ocasionales de ferretería minorista (12 % de la venta, 3 % del margen)."],
            ["2", "Entrega completa en 24 horas", "Cumplir la promesa de marca en el 95 % de los pedidos de referencias críticas desde un centro de distribución en Barranquilla.", "OTIF en referencias críticas · reclamos por faltante", "Operaciones", "Dejamos de aceptar pedidos urgentes fuera del portafolio crítico sin recargo."],
            ["3", "Margen defendible", "Llevar el margen operacional del 6,5 % al 9 % con precios por segmento y costo logístico por pedido.", "Margen operacional · costo logístico por pedido", "Administración y finanzas", "Eliminamos los descuentos no autorizados y la venta a crédito a clientes sin cupo aprobado."],
            ["4", "Equipo que crece con la empresa", "Cubrir con sucesores internos el 80 % de los cargos críticos y bajar la rotación de vendedores a menos del 15 %.", "Cargos críticos con sucesor listo · rotación comercial", "Talento humano", "No abrimos sedes nuevas hasta tener jefe formado para cada una."],
          ].map((r) => <tr key={r[0]} className="border-t border-line align-top">{r.map((c, i) => <td key={i} className={`px-3 py-2 leading-snug ${i === 1 ? "font-semibold text-ink" : "text-ink-soft"}`}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
    <p className="mt-3 text-[12.5px] leading-relaxed text-muted">Lo que hace bien este ejemplo: cuatro apuestas (no áreas), cada una con un resultado del ciclo ligado a la meta de $ 48.000 millones y al «dónde jugamos», uno o dos indicadores, un sponsor distinto por prioridad y una renuncia concreta y verificable. De cada prioridad saldrán después de 1 a 3 objetivos directivos del año, con sus resultados clave e iniciativas.</p>
  </> },
  { k: "Ejemplo exigente", t: "Una prioridad escrita con rigor técnico", body: <>
    <p className="text-[12.5px] leading-relaxed text-muted">Laboratorios Cordillera, empresa ficticia de 420 personas que fabrica y comercializa medicamentos de prescripción y genéricos en Colombia. Aquí el estándar es más alto: cada prioridad declara línea base, meta y fecha, define cada indicador con fórmula, fuente y frecuencia, nombra un sponsor por cargo y una renuncia con cifra. Lo que no pasa la prueba de exigencia no entra al ciclo.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      {[["Meta ambiciosa", "Ventas netas de $ 610.000 millones en 2030 (2026: $ 402.000 millones) con EBITDA ≥ 18 % (2026: 14,1 %), sin sanciones regulatorias con cierre de línea."], ["Dónde jugamos", "Prescripción en cardiometabolismo y sistema nervioso central, y genéricos de marca en canal institucional (EPS, IPS, operadores logísticos). No jugamos en OTC de consumo masivo ni en licitaciones por debajo del costo variable."], ["Promesa diferenciadora", "Disponibilidad garantizada del portafolio esencial: fill rate ≥ 98 % en las 40 moléculas que concentran el 80 % de la venta institucional."]].map(([a, b]) => (
        <div key={a} className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[12px] font-bold uppercase tracking-wider text-faint">{a}</div><div className="text-[12.5px] leading-snug text-ink">{b}</div></div>
      ))}
    </div>
    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-[12px]">
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-3 py-2">N.º</th><th className="px-3 py-2">Prioridad y tesis</th><th className="px-3 py-2">Resultado del ciclo (línea base → meta · fecha)</th><th className="px-3 py-2">Indicador: fórmula · fuente · frecuencia</th><th className="px-3 py-2">Sponsor</th><th className="px-3 py-2">Renuncia con cifra</th></tr></thead>
        <tbody>
          {[
            ["1", "Liderazgo en cardiometabolismo institucional — la mitad del crecimiento de la meta sale de ganar participación en las moléculas donde ya somos 2.º o 3.º.", "Participación en valor en las 12 moléculas cardiometabólicas priorizadas del 11,4 % al 18 % · dic-2030. Hito intermedio: 14 % a dic-2028.", "Participación en valor = ventas Cordillera ÷ ventas del mercado de la molécula, canal institucional · fuente: auditoría de mercado IQVIA + ventas propias conciliadas · mensual, con corte trimestral para el comité.", "Vicepresidencia comercial", "Salimos de 23 moléculas de baja rotación que suman el 4 % de la venta y el 1 % del margen; se descontinúan antes de jun-2027 con plan de agotamiento de inventario."],
            ["2", "Disponibilidad garantizada del portafolio esencial — la promesa de marca solo vale si se mide pedido a pedido.", "Fill rate del portafolio esencial del 91,2 % al 98 % sostenido 4 trimestres consecutivos · dic-2029. Quiebres de stock > 5 días en moléculas esenciales: de 31 al año a 0.", "Fill rate = unidades despachadas completas en fecha ÷ unidades pedidas, por línea de pedido, 40 moléculas esenciales · fuente: ERP (módulo de pedidos) conciliado con el operador logístico · semanal.", "Vicepresidencia de operaciones y cadena de abastecimiento", "No se aceptan ampliaciones de portafolio ni maquilas para terceros que usen capacidad de las líneas del portafolio esencial hasta alcanzar el 96 %; se renuncia a $ 9.000 millones de venta de maquila en 2027."],
            ["3", "Cumplimiento regulatorio como ventaja competitiva — cada hallazgo crítico cuesta más que todo lo que se ahorra evitándolo.", "Cero hallazgos críticos del INVIMA en inspecciones de BPM y farmacovigilancia durante el ciclo (2024-2026: 3 críticos, 1 cierre parcial de línea de 11 días). Tiempo de cierre de hallazgos mayores: de 94 a ≤ 45 días.", "N.º de hallazgos críticos y mayores por inspección · fuente: actas de inspección y sistema de gestión de calidad (CAPA) · por evento, con tablero mensual. Días de cierre = fecha de cierre verificado − fecha del acta.", "Dirección técnica y de asuntos regulatorios", "Se suspende el lanzamiento de cualquier producto cuyo expediente tenga observaciones abiertas, aunque tenga fecha comercial comprometida; se difieren 4 lanzamientos de 2027 a 2028."],
            ["4", "Rentabilidad por molécula — la meta de EBITDA se logra decidiendo qué se fabrica, no recortando gastos de forma lineal.", "EBITDA del 14,1 % al 18 % · dic-2030, con el 100 % de las moléculas con margen de contribución calculado y las del cuartil inferior con decisión documentada (reformular, subir precio, descontinuar).", "EBITDA ÷ ventas netas · fuente: estados financieros auditados, cierre mensual · mensual. Margen de contribución por molécula = precio neto − costo variable total (materia prima, conversión, logística, regulatorio) · costeo ABC · trimestral.", "Vicepresidencia financiera", "Se elimina la práctica de descuentos de cierre de trimestre por encima del 12 % para alcanzar la cuota ($ 6.500 millones de margen cedido en 2026)."],
          ].map((r) => <tr key={r[0]} className="border-t border-line align-top">{r.map((c, i) => <td key={i} className={`px-3 py-2 leading-snug ${i === 1 ? "font-semibold text-ink" : "text-ink-soft"}`}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
    <div className="mt-3 rounded-xl bg-surface-2 px-3 py-2.5">
      <div className="text-[12px] font-bold uppercase tracking-wider text-faint">Prueba de exigencia: una prioridad entra al ciclo solo si pasa las siete</div>
      <ol className="mt-1.5 grid gap-1 text-[12.5px] leading-snug text-ink sm:grid-cols-2">
        {["Es una apuesta, no un área ni una función: cambia una posición en el mercado, una promesa o una restricción del negocio.", "Tiene línea base con fecha, meta con cifra y fecha de cumplimiento; si hay hito intermedio, también con cifra.", "Cada indicador trae fórmula, fuente del dato, frecuencia de medición y quién lo reporta; si el dato no existe hoy, la primera iniciativa es construirlo.", "Un solo sponsor, nombrado por cargo, distinto para cada prioridad y con autoridad sobre el presupuesto que la sostiene.", "La renuncia es verificable y cuantificada: qué sale, cuánto vale, desde cuándo.", "Explica en una frase cómo acerca la meta ambiciosa y en qué parte del «dónde jugamos» ocurre.", "No se solapa con otra prioridad: si dos comparten el mismo indicador principal, se funden o se separan por alcance."].map((t, i) => <li key={i} className="flex gap-2"><span className="font-mono text-[11px] text-faint">{i + 1}.</span><span>{t}</span></li>)}
      </ol>
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Mal>«Fortalecer la excelencia operativa y la calidad para ser más competitivos en el mercado.» (no dice qué cambia ni cuánto; «calidad» y «competitivos» no tienen fórmula; no hay sponsor ni renuncia)</Mal>
      <Bien>«Disponibilidad garantizada del portafolio esencial: fill rate de las 40 moléculas esenciales del 91,2 % al 98 % sostenido 4 trimestres a dic-2029, medido semanalmente desde el ERP conciliado con el operador logístico; sponsor: Vicepresidencia de operaciones; renuncia: sin maquilas para terceros en esas líneas hasta llegar al 96 % ($ 9.000 millones en 2027).»</Bien>
    </div>
  </> },
  { k: "En la plataforma", t: "Cómo se usan aquí", body: <ul className="space-y-2">
    <Li>Las prioridades validadas por la dirección son el marco fijo: la validación de alineación evalúa los objetivos frente a ellas y no las cuestiona.</Li>
    <Li>Una prioridad cargada como <b>propuesta</b> (pendiente de aprobación) se muestra con su chip; sus objetivos se validan igual, señalando que dependen de esa aprobación.</Li>
    <Li>El sponsor de la prioridad es el dueño por defecto de sus resultados clave e iniciativas y abre la sesión de priorización de su prioridad.</Li>
    <Li>Objetivos directivos, resultados clave, iniciativas, priorización, portafolio y cascada trimestral se leen por prioridad: es el eje de toda la cadena.</Li>
  </ul> },
  pasos("prioridades"),
  quienes("Prioridades estratégicas", "Define, edita, ordena y elimina las prioridades: nombre, resultado del ciclo, indicadores, sponsor y renuncia.", "Facilita la sesión F01, cuida la prueba de exigencia de los siete criterios y que cada prioridad tenga un sponsor distinto.", "Los sponsors responden por su prioridad en el ritmo trimestral; no editan las de los demás por fuera de la sesión."),
];

/** Simulación de una priorización con la misma experiencia del usuario: la iniciativa de ejemplo se califica en
    modo focal, un criterio por pantalla (EvaluacionFocal); al registrar, se muestra el puntaje propio, el de otros
    dos evaluadores fijos, el consolidado, las señales y las decisiones admisibles. */
const SIM_INI = {
  id: "SIM-01", name: "Modelo de cobertura omnicanal del panel médico AAA y AA",
  objetivo: "Cubrir el 100 % del panel AAA y AA con una combinación de visita presencial, visita virtual y contenido científico digital, para subir la frecuencia de contacto sin aumentar la fuerza de ventas.",
};
const SIM_HECHOS: [string, string][] = [
  ["Resultado clave que mueve", "Frecuencia de contacto con el panel AAA/AA: de 1,8 a 2,6 contactos por médico al mes a dic-2027 (línea base 2026: 1,8). La iniciativa es la principal palanca de ese KR."],
  ["Cómo se comprobará", "Indicador: contactos efectivos por médico/mes en el CRM, cruzado con prescripción IQVIA del panel. Corte a jun-2027: si no llega a 2,2 contactos, se ajusta el mix o se detiene."],
  ["Qué permanece y dónde se replica", "Deja el modelo de segmentación, los guiones y la plataforma de contenido; en 2028 se replica a la línea de sistema nervioso central con la misma estructura, sin contratar visitadores."],
  ["Capacidad", "Responsable: dirección de marketing médico, con autoridad sobre el presupuesto. Presupuesto aprobado: $ 480 millones. Pendiente: la integración del CRM con la plataforma de contenido, con proveedor contratado y entrega a mar-2027."],
];
const SIM_OTROS: { nombre: string; scores: Record<"D" | "E" | "M" | "L", Level>; marcas: number; sustento: string }[] = [
  { nombre: "Sponsor de la prioridad", scores: { D: 4, E: 3, M: 3, L: 3 }, marcas: 4, sustento: "Es la palanca principal del KR de frecuencia; tiene indicador, método y corte; replicable a SNC; queda la integración del CRM con cierre definido." },
  { nombre: "Directivo de operaciones", scores: { D: 3, E: 3, M: 2, L: 2 }, marcas: 3, sustento: "Aporte directo, pero la réplica a SNC no está demostrada y la integración del CRM es una dependencia crítica sin holgura." },
];
function SimuladorPriorizacion({ rule = DEFAULT_TYPE_RULE }: { rule?: TypeRule }) {
  const [evaluando, setEvaluando] = useState(false);
  const [mia, setMia] = useState<EvaluacionGuardable | null>(null);
  const marcasDe = (n: number) => Object.fromEntries(rule.criteria.map((c, i) => [c.key, i < n ? "ESTRATEGICO" : "TACTICO"])) as Record<string, TypeMark>;
  const evals: Evaluation[] = [
    ...(mia ? [{ iniId: SIM_INI.id, by: "tu", name: "Tú", role: "DIRECTIVO", at: "", scores: mia.scores, type: mia.type, notes: mia.notes } as unknown as Evaluation] : []),
    ...SIM_OTROS.map((o, i) => ({ iniId: SIM_INI.id, by: `e${i}`, name: o.nombre, role: "DIRECTIVO", at: "", scores: o.scores, type: marcasDe(o.marcas), notes: {} } as unknown as Evaluation)),
  ];
  const c = consolidate(evals, rule);
  const tipoDe = (ev: Evaluation) => (typeOf(ev.type, rule, ev.scores) === "ESTRATEGICO" ? "estratégica" : "táctica");
  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-muted">La simulación usa exactamente la misma pantalla con la que calificarás las iniciativas reales: a pantalla completa, un criterio por paso, con la pregunta y la descripción de cada nivel a la vista. Lee la ficha de la iniciativa de ejemplo, califícala y compara tu valoración con la de otros dos evaluadores.</p>
      <div className="panel px-4 py-3.5">
        <div className="num text-[11px] font-bold uppercase tracking-[0.14em] text-faint">{SIM_INI.id} · iniciativa de ejemplo</div>
        <div className="mt-0.5 text-[15px] font-extrabold leading-snug text-ink">{SIM_INI.name}</div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{SIM_INI.objetivo}</p>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {SIM_HECHOS.map(([a, b]) => <div key={a} className="rounded-xl bg-surface-2 px-3 py-2"><div className="text-[11px] font-bold uppercase tracking-wider text-faint">{a}</div><div className="text-[12px] leading-snug text-ink">{b}</div></div>)}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setEvaluando(true)} className="btn-primary inline-flex items-center gap-1.5 text-[12.5px]">{mia ? "Volver a calificar" : "Calificar esta iniciativa"} · {rule.criteria.length + CRITERIA.length} criterios</button>
          <span className="text-[12px] text-muted">{mia ? "Tu calificación es de prueba: no se guarda en la plataforma." : "Nada de lo que marques aquí se guarda: es un ensayo."}</span>
        </div>
      </div>
      {evaluando && (
        <EvaluacionFocal key={mia ? "otra" : "primera"} ini={{ ...SIM_INI, detalle: <ul className="space-y-1">{SIM_HECHOS.map(([a, b]) => <li key={a}><b className="text-ink">{a}:</b> {b}</li>)}</ul> }} rule={rule} initial={mia ? ({ scores: mia.scores, type: mia.type, notes: mia.notes } as unknown as Evaluation) : undefined} saving={false} titulo="Simulación · ayuda metodológica F16"
          onSave={async (ev) => { setMia(ev); setEvaluando(false); return true; }} onExit={() => setEvaluando(false)} />
      )}
      {mia && (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            {evals.map((ev, i) => (
              <div key={i} className={`rounded-xl px-3 py-2.5 ${i === 0 ? "bg-cyan-wash" : "bg-surface-2"}`}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-faint">{ev.name}</div>
                <div className="num text-[12px] text-ink">{(["D", "E", "M", "L"] as const).map((k) => `${k} ${ev.scores[k]}`).join(" · ")}</div>
                <div className="num text-[12px] text-muted">puntaje <b className="text-ink">{score(ev.scores)}</b> · {tipoDe(ev)}</div>
                {i > 0 && <div className="mt-1 text-[11.5px] leading-snug text-muted">{SIM_OTROS[i - 1].sustento}</div>}
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[11px] font-bold uppercase tracking-wider text-faint">Consolidado ({c.n} evaluadores)</div><div className="num text-[13px] text-ink">Promedios I {c.avg.D} · E {c.avg.E} · S {c.avg.M} · C {c.avg.L}</div><div className="num text-[12px] text-muted">Redondeo {c.rounded.D}/{c.rounded.E}/{c.rounded.M}/{c.rounded.L} → puntaje <b className="text-ink">{c.score}</b></div><div className="text-[12px] text-muted">Tipo por mayoría: <b className="text-ink">{c.type === "ESTRATEGICO" ? "Estratégica" : "Táctica"}</b> ({c.strategicVotes} de {c.n})</div></div>
            <div className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[11px] font-bold uppercase tracking-wider text-faint">Señales</div>
              <div className="mt-1 flex flex-wrap gap-1"><span className={`chip !py-0 text-[11px] ${c.eligible ? "chip-ok" : "chip-bad"}`}>{c.eligible ? "elegible (impacto ≥ 3)" : "no elegible (impacto < 3)"}</span><span className={`chip !py-0 text-[11px] ${c.capacityFirst ? "chip-warn" : "chip-ok"}`}>{c.capacityFirst ? "capacidad primero (C ≤ 2)" : "capacidad resuelta"}</span><span className={`chip !py-0 text-[11px] ${c.lowConsensus ? "chip-bad" : "chip-ok"}`}>{c.lowConsensus ? `bajo consenso (±${c.spread})` : `consenso (±${c.spread})`}</span></div></div>
            <div className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[11px] font-bold uppercase tracking-wider text-faint">Decisiones admisibles</div>
              <ul className="mt-1 space-y-0.5 text-[12px]">{DECISIONS.map((d) => { const r = decisionCheck(d.key, c, d.key === "RENUNCIAR" ? "motivo registrado" : undefined); return <li key={d.key} className="flex items-start gap-1.5"><span className={r.ok ? "text-ok" : "text-bad"}>{r.ok ? "✓" : "✗"}</span><span className="text-ink">{d.label}{!r.ok && <span className="block text-[11px] leading-snug text-muted">{r.reason}</span>}</span></li>; })}</ul></div>
          </div>
          <p className="text-[12px] leading-relaxed text-muted">Así se vería en Priorización: el consolidado se recalcula con cada calificación registrada; entre las estratégicas elegibles del horizonte se ordena de mayor a menor puntaje, con empates por impacto y luego por evidencia. {c.lowConsensus ? "Hay bajo consenso: en la sesión real conviene conversar el criterio con mayor diferencia antes de decidir." : "Hay consenso: el comité directivo puede registrar la decisión de tiempo con el advisor."}</p>
        </>
      )}
    </div>
  );
}

const priorizacionLaminas = (rule: TypeRule): Lamina[] => [
  { k: "Qué es", t: "Convertir el inventario de iniciativas en un portafolio ejecutable", body: <>
    <p className="text-[14px] leading-relaxed text-ink">La <b>priorización de iniciativas</b> (F16) separa tres cosas que suelen mezclarse: <b>cuánto vale</b> una iniciativa, <b>de qué tipo</b> es y <b>cuándo</b> se hace. Solo entran las que mueven un resultado clave; se califican con cuatro criterios de peso fijo, se consolidan en grupo y se ordenan por horizonte antes de decidir su tiempo.</p>
    <p className="mt-3 text-[13px] leading-relaxed text-muted">Resultado: pocas iniciativas, con dueño y con una decisión de tiempo. Lo táctico no se desecha: se transfiere al área con responsable nombrado.</p>
  </> },
  { k: "Condición de entrada", t: "Qué se puede calificar", body: <ul className="space-y-2">
    <Li><b>Vinculada a un resultado clave:</b> es la única condición para calificar. El objetivo de ese resultado clave debe seguir en pie: con prioridad y sin descartar. Máximo dos iniciativas por resultado clave; una iniciativa puede mover de uno a tres.</Li>
    <Li><b>Parcialmente alineada también se califica:</b> si la validación de iniciativas la deja en amarillo o en rojo, o aún no se ha validado, la iniciativa entra igual a la calificación. La lectura queda como referencia para el comité.</Li>
    <Li><b>Con pendientes:</b> si al resultado clave o a la formulación les falta algo (qué logra, responsable, inicio y fin, capacidad que instala, presupuesto planeado), el ranking la marca «con pendientes» y dice qué falta. No impide calificar; conviene completarlo antes de decidir el tiempo.</Li>
    <Li>Lo que no está vinculado a un resultado clave aparece con el motivo «sin KR» y no se puede calificar.</Li>
  </ul> },
  { k: "Criterios y pesos", t: "Cuatro criterios con peso fijo", body: <>
    <p className="text-[12.5px] leading-relaxed text-muted">Los pesos expresan la tesis del método: primero el resultado y la evidencia, después la réplica; la capacidad pesa poco porque se resuelve, no se premia. Puntaje = (40·I + 30·E + 20·S + 10·C) ÷ 4, de 25 a 100. Cada persona califica una sola vez y deja su sustento.</p>
    <div className="mt-3 overflow-x-auto rounded-xl border border-line"><table className="w-full text-[12px]"><thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Criterio</th><th className="px-2 py-2">Peso</th><th className="px-2 py-2">Nivel 1</th><th className="px-2 py-2">Nivel 4</th></tr></thead><tbody>
      {CRITERIA.map((k) => <tr key={k.key} className="border-t border-line align-top"><td className="px-3 py-1.5 font-semibold text-ink">{k.name}</td><td className="num px-2 py-1.5">{k.weight} %</td><td className="px-2 py-1.5 text-ink-soft">{k.levels[1]}</td><td className="px-2 py-1.5 text-ink-soft">{k.levels[4]}</td></tr>)}
    </tbody></table></div>
    <p className="mt-2 text-[12px] text-muted">Antes de abrir la ventana, calibra con el equipo un ejemplo común: acuerden qué es un 3 y qué es un 4 ({Object.values(LEVEL_NAMES).join(" · ")}).</p>
  </> },
  { k: "Tipo", t: "Estratégica o táctica", body: <>
    <p className="text-[13px] leading-relaxed text-ink">Es estratégica la iniciativa que cumple al menos <b>tres de las cuatro marcas</b>. La táctica no se desecha: se transfiere al área con responsable y sale del portafolio estratégico. Es la única pieza que una empresa puede sustituir por su propia regla.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{TYPE_CRITERIA.map((t) => <div key={t.key} className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[12px] font-bold text-ink">{t.name}</div><div className="mt-0.5 text-[12px] leading-snug text-ink-soft"><b>Estratégica:</b> {t.strategic}</div><div className="mt-0.5 text-[12px] leading-snug text-muted"><b>Táctica:</b> {t.tactical}</div></div>)}</div>
  </> },
  { k: "Consolidación", t: "Consolidación, señales y orden", body: <ul className="space-y-2">
    <Li><b>Consolidar:</b> promedio de cada criterio entre evaluadores, redondeado al nivel más cercano; el puntaje se recalcula con esos promedios; el tipo se decide por mayoría.</Li>
    <Li><b>Elegible como prioridad crítica</b> cuando el impacto consolidado es 3 o 4.</Li>
    <Li><b>Capacidad primero</b> cuando la capacidad queda en 1 o 2: se resuelve responsable, disponibilidad o recursos antes de arrancar.</Li>
    <Li><b>Bajo consenso</b> cuando entre el mayor y el menor puntaje individual hay más de 15 puntos: conviene conversar antes de decidir.</Li>
    <Li><b>Orden:</b> de mayor a menor puntaje entre las estratégicas elegibles de cada horizonte; empates por impacto y luego por evidencia.</Li>
  </ul> },
  { k: "Decisión de tiempo", t: "Quien gobierna el portafolio decide", body: <>
    <div className="grid gap-2 sm:grid-cols-2">{DECISIONS.map((d) => <div key={d.key} className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[12px] font-bold text-ink">{d.label}</div><div className="mt-0.5 text-[12px] leading-snug text-ink-soft">{d.rule}</div></div>)}</div>
    <p className="mt-3 text-[12.5px] leading-relaxed text-muted">Implementar exige elegible y capacidad resuelta; preparar o validar exige al menos una evaluación; renunciar exige motivo. Se registra autor y fecha; una iniciativa puede cambiar de decisión, pero su calificación histórica no se reescribe.</p>
  </> },
  { k: "Simulación", t: "Simula una priorización", body: <SimuladorPriorizacion rule={rule} /> },
  { k: "En la plataforma", t: "Cómo se hace aquí", body: <ul className="space-y-2">
    <Li>El advisor abre la calificación de una prioridad, o de todas a la vez; mientras está abierta, cada miembro del comité califica una sola vez cada iniciativa y el ranking se actualiza en vivo.</Li>
    <Li>Al cerrar, el advisor revisa el orden (puede ajustarlo a mano), propone el trimestre de inicio y guarda; el comité directivo ratifica y decide el tiempo en Portafolio.</Li>
    <Li>Las decisiones de tiempo se registran en Portafolio con autor, fecha y motivo; las renuncias exigen motivo.</Li>
    <Li>Una iniciativa que cambia después de calificada conserva su calificación; si cambia de fondo, se reinicia su sesión y se vuelve a calificar.</Li>
  </ul> },
  pasos("priorizacion"),
  quienes("Priorización", "Cada miembro califica una sola vez cada iniciativa con los criterios D·E·M·L; con el consolidado, el comité decide el tiempo en Portafolio.", "Abre y cierra la calificación por prioridad (o todas a la vez), ajusta el orden si hace falta, propone el trimestre de inicio y guarda.", "El responsable de una capacidad califica las iniciativas de la suya.")
];

export function AyudaMetodologica({ tema, rule }: { tema: "objetivos" | "resultados-clave" | "iniciativas" | "prioridades" | "priorizacion" | "capacidades" | "cascada" | "portafolio"; rule?: TypeRule }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const laminas = tema === "objetivos" ? OBJETIVOS : tema === "iniciativas" ? INICIATIVAS : tema === "prioridades" ? PRIORIDADES : tema === "priorizacion" ? priorizacionLaminas(rule ?? DEFAULT_TYPE_RULE) : tema === "capacidades" ? CAPACIDADES : tema === "cascada" ? CASCADA : tema === "portafolio" ? PORTAFOLIO : KR;
  const titulo = tema === "objetivos" ? "Objetivos directivos · ayuda metodológica" : tema === "iniciativas" ? "Iniciativas · ayuda metodológica" : tema === "prioridades" ? "Prioridades estratégicas · ayuda metodológica (F01)" : tema === "priorizacion" ? "Priorización de iniciativas · ayuda metodológica (F16)" : tema === "capacidades" ? "Capacidades para ejecutar · ayuda metodológica" : tema === "cascada" ? "Cascada y plan trimestral · ayuda metodológica (F04)" : tema === "portafolio" ? "Portafolio · ayuda metodológica" : "Resultados clave · ayuda metodológica";
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

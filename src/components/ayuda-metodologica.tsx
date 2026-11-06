"use client";

// Ayuda metodológica tipo presentación: qué es, para qué sirve, cómo se estructura y cómo se formula un objetivo
// directivo o un resultado clave, según el marco 4Shine Empresas. Se abre desde un botón en la barra de cada sección.

import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui";
import { BookOpen, ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { CRITERIA, LEVEL_NAMES, TYPE_CRITERIA, consolidate, score, decisionCheck, DECISIONS, type Evaluation, type Level, type TypeMark } from "@/lib/priorizacion";

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
];

/** Simulación interactiva de una priorización: tres evaluadores califican una iniciativa; se ve el puntaje de cada uno,
    el consolidado, el tipo por mayoría, las tres señales y qué decisiones de tiempo son admisibles. */
function SimuladorPriorizacion() {
  type Fila = { nombre: string; D: Level; E: Level; M: Level; L: Level; marcas: number };
  const [filas, setFilas] = useState<Fila[]>([
    { nombre: "Sponsor", D: 4, E: 3, M: 3, L: 3, marcas: 4 },
    { nombre: "Directivo 2", D: 3, E: 3, M: 2, L: 2, marcas: 3 },
    { nombre: "Directivo 3", D: 4, E: 2, M: 3, L: 3, marcas: 2 },
  ]);
  const set = (i: number, k: keyof Fila, v: number) => setFilas((f) => f.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const evals: Evaluation[] = filas.map((f, i) => ({ iniId: "sim", by: `e${i}`, name: f.nombre, role: "DIRECTIVO", at: "", scores: { D: f.D, E: f.E, M: f.M, L: f.L }, type: Object.fromEntries(TYPE_CRITERIA.map((c, n) => [c.key, n < f.marcas ? "ESTRATEGICO" : "TACTICO"])) as Record<string, TypeMark>, notes: {} } as unknown as Evaluation));
  const c = consolidate(evals);
  const niveles: Level[] = [1, 2, 3, 4];
  const Sel = ({ v, on }: { v: number; on: (n: number) => void }) => <select value={v} onChange={(e) => on(Number(e.target.value))} className="input !py-0.5 pr-6 !text-[12px]">{niveles.map((n) => <option key={n} value={n}>{n}</option>)}</select>;
  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-muted">Cambia las calificaciones y mira cómo se mueven el puntaje, el consolidado, las señales y las decisiones admisibles. Iniciativa de ejemplo: «Modelo de cobertura omnicanal del panel médico AAA y AA», vinculada al resultado clave de frecuencia de visita.</p>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-[12px]">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Evaluador</th>{CRITERIA.map((k) => <th key={k.key} className="px-2 py-2" title={k.name}>{k.short} · {k.weight} %</th>)}<th className="px-2 py-2">Marcas estratégicas (de 4)</th><th className="num px-2 py-2 text-right">Puntaje</th><th className="px-2 py-2">Tipo</th></tr></thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="border-t border-line">
                <td className="px-3 py-1.5 font-semibold text-ink">{f.nombre}</td>
                {(["D", "E", "M", "L"] as const).map((k) => <td key={k} className="px-2 py-1.5"><Sel v={f[k]} on={(n) => set(i, k, n)} /></td>)}
                <td className="px-2 py-1.5"><select value={f.marcas} onChange={(e) => set(i, "marcas", Number(e.target.value))} className="input !py-0.5 pr-6 !text-[12px]">{[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select></td>
                <td className="num px-2 py-1.5 text-right font-extrabold text-ink">{score(f)}</td>
                <td className="px-2 py-1.5 text-ink-soft">{f.marcas >= 3 ? "Estratégica" : "Táctica"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[11px] font-bold uppercase tracking-wider text-faint">Consolidado</div><div className="num text-[13px] text-ink">Promedios I {c.avg.D} · E {c.avg.E} · S {c.avg.M} · C {c.avg.L}</div><div className="num text-[12px] text-muted">Redondeo {c.rounded.D}/{c.rounded.E}/{c.rounded.M}/{c.rounded.L} → puntaje <b className="text-ink">{c.score}</b></div><div className="text-[12px] text-muted">Tipo por mayoría: <b className="text-ink">{c.type === "ESTRATEGICO" ? "Estratégica" : "Táctica"}</b> ({c.strategicVotes} de {c.n})</div></div>
        <div className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[11px] font-bold uppercase tracking-wider text-faint">Señales</div>
          <div className="mt-1 flex flex-wrap gap-1"><span className={`chip !py-0 text-[11px] ${c.eligible ? "chip-ok" : "chip-bad"}`}>{c.eligible ? "elegible (impacto ≥ 3)" : "no elegible (impacto < 3)"}</span><span className={`chip !py-0 text-[11px] ${c.capacityFirst ? "chip-warn" : "chip-ok"}`}>{c.capacityFirst ? "capacidad primero (C ≤ 2)" : "capacidad resuelta"}</span><span className={`chip !py-0 text-[11px] ${c.lowConsensus ? "chip-bad" : "chip-ok"}`}>{c.lowConsensus ? `bajo consenso (±${c.spread})` : `consenso (±${c.spread})`}</span></div></div>
        <div className="rounded-xl bg-surface-2 px-3 py-2.5"><div className="text-[11px] font-bold uppercase tracking-wider text-faint">Decisiones admisibles</div>
          <ul className="mt-1 space-y-0.5 text-[12px]">{DECISIONS.map((d) => { const r = decisionCheck(d.key, c, d.key === "RENUNCIAR" ? "motivo registrado" : undefined); return <li key={d.key} className="flex items-start gap-1.5"><span className={r.ok ? "text-ok" : "text-bad"}>{r.ok ? "✓" : "✗"}</span><span className="text-ink">{d.label}{!r.ok && <span className="block text-[11px] leading-snug text-muted">{r.reason}</span>}</span></li>; })}</ul></div>
      </div>
      <p className="text-[12px] leading-relaxed text-muted">Orden en el horizonte: entre las estratégicas elegibles, de mayor a menor puntaje; empates por impacto y luego por evidencia. Las tácticas se transfieren al área; las no elegibles y las sin evaluar quedan fuera del orden.</p>
    </div>
  );
}

const PRIORIZACION: Lamina[] = [
  { k: "Qué es", t: "Convertir el inventario de iniciativas en un portafolio ejecutable", body: <>
    <p className="text-[14px] leading-relaxed text-ink">La <b>priorización de iniciativas</b> (F16) separa tres cosas que suelen mezclarse: <b>cuánto vale</b> una iniciativa, <b>de qué tipo</b> es y <b>cuándo</b> se hace. Solo entran las que mueven un resultado clave; se califican con cuatro criterios de peso fijo, se consolidan en grupo y se ordenan por horizonte antes de decidir su tiempo.</p>
    <p className="mt-3 text-[13px] leading-relaxed text-muted">Resultado: pocas iniciativas, con dueño y con una decisión de tiempo. Lo táctico no se desecha: se transfiere al área con responsable nombrado.</p>
  </> },
  { k: "Condición de entrada", t: "Qué se puede calificar", body: <ul className="space-y-2">
    <Li><b>Vinculada a un resultado clave completo:</b> cifra, línea base, meta distinta de la base, unidad, dueño, plazo y fórmula. Máximo dos iniciativas por resultado clave.</Li>
    <Li><b>Formulación completa:</b> qué logra, responsable, inicio y fin, capacidad que instala y presupuesto planeado (los elementos de la ayuda de Iniciativas).</Li>
    <Li><b>Validada en la etapa anterior:</b> la validación de iniciativas la deja en verde. Lo amarillo se corrige y se revalida; lo rojo se replantea.</Li>
    <Li>Lo que no cumple aparece en el ranking con el motivo («sin KR», «incompleta», «sin validar») y no se puede calificar.</Li>
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
  { k: "Simulación", t: "Simula una priorización", body: <SimuladorPriorizacion /> },
  { k: "En la plataforma", t: "Cómo se hace aquí", body: <ul className="space-y-2">
    <Li>El advisor abre la calificación de una prioridad, o de todas a la vez; mientras está abierta, cada miembro del comité califica una sola vez cada iniciativa y el ranking se actualiza en vivo.</Li>
    <Li>Al cerrar, el advisor revisa el orden (puede ajustarlo a mano), propone el trimestre de inicio y guarda; la dirección ratifica.</Li>
    <Li>Las decisiones de tiempo se registran en Portafolio con autor, fecha y motivo; las renuncias exigen motivo.</Li>
    <Li>Una iniciativa que cambia después de calificada conserva su calificación; si cambia de fondo, se reinicia su sesión y se vuelve a calificar.</Li>
  </ul> },
];

export function AyudaMetodologica({ tema }: { tema: "objetivos" | "resultados-clave" | "iniciativas" | "prioridades" | "priorizacion" }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const laminas = tema === "objetivos" ? OBJETIVOS : tema === "iniciativas" ? INICIATIVAS : tema === "prioridades" ? PRIORIDADES : tema === "priorizacion" ? PRIORIZACION : KR;
  const titulo = tema === "objetivos" ? "Objetivos directivos · ayuda metodológica" : tema === "iniciativas" ? "Iniciativas · ayuda metodológica" : tema === "prioridades" ? "Prioridades estratégicas · ayuda metodológica (F01)" : tema === "priorizacion" ? "Priorización de iniciativas · ayuda metodológica (F16)" : "Resultados clave · ayuda metodológica";
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

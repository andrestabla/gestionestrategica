// Páginas públicas de los dos diagnósticos de entrada (/diagnosticos/<slug>): propósito, cómo se hace, qué se
// recibe, para qué sirven los resultados y lo que conviene saber. El texto describe lo que la plataforma hace
// hoy; si cambia el instrumento, se actualiza aquí. Las secciones con figuras (qué mide, cómo se calcula y
// qué resultados arroja) están en src/app/diagnosticos/[slug]/secciones.tsx. «icono» es un nombre de
// lucide-react que la página resuelve en ICONOS.

export type Quien = "Tú" | "La plataforma" | "Tu asesor";
type Tarjeta = { icono: string; t: string; d: string };

export type DiagnosticoPublico = {
  slug: string; corto: string; titulo: string; bajada: string; resumen: string;
  cifras: { valor: string; rotulo: string }[];
  proposito: Tarjeta[];
  pasos: (Tarjeta & { quien: Quien })[];
  duracion: string;
  recibes: { icono: string; t: string }[];
  usos: Tarjeta[];      // para qué sirven los resultados
  noEs: { t: string; d: string }[];
  responde: Tarjeta[];
  asunto: string;       // asunto del correo de «Solicitar un código»
};

export const DIAGNOSTICOS_PUBLICOS: DiagnosticoPublico[] = [
  {
    slug: "madurez-digital",
    corto: "Madurez digital",
    titulo: "Diagnóstico de madurez en transformación digital",
    bajada: "Mide qué tan instaladas están las prácticas digitales de la organización, las contrasta con evidencia y las compara con lo que hacen las empresas de su industria.",
    resumen: "Compara el nivel de madurez digital de la organización con un marco de referencia y entrega hallazgos, recomendaciones y la evidencia que los respalda.",
    cifras: [
      { valor: "48", rotulo: "prácticas evaluadas" },
      { valor: "4", rotulo: "frentes de la transformación" },
      { valor: "1 a 5", rotulo: "nivel de madurez de cada práctica" },
      { valor: "0 a 100", rotulo: "índice general y de preparación para IA" },
    ],
    proposito: [
      { icono: "MapPinned", t: "Saber dónde está la organización", d: "Un nivel de madurez de 1 a 5 en cada uno de los cuatro frentes de la transformación digital." },
      { icono: "Scale", t: "Separar lo que se cree de lo que se demuestra", d: "La percepción de las personas se contrasta con la evidencia de cada práctica: si está documentada, si se usa de verdad y si se mide su resultado." },
      { icono: "Building2", t: "Compararse con la industria", d: "La plataforma reúne hechos con fuente sobre el sector de la organización: cifras de adopción digital, iniciativas de otras empresas y exigencias regulatorias." },
      { icono: "Signpost", t: "Decidir por dónde empezar", d: "El informe ordena las prioridades con su primer paso, su plazo, su esfuerzo y su impacto, y propone una ruta a doce meses." },
    ],
    pasos: [
      { icono: "KeyRound", quien: "Tú", t: "Registras tu organización", d: "Con el código que te envía tu asesor escribes el nombre, el sector y la ciudad. La plataforma crea el espacio de la organización y empieza a reunir información de su industria." },
      { icono: "ClipboardList", quien: "Tú", t: "Respondes la percepción", d: "Cuarenta y ocho afirmaciones sobre prácticas concretas. Indicas qué tan de acuerdo estás, de 1 a 5, o marcas «No lo sé». El avance se guarda y puedes retomarlo." },
      { icono: "Eye", quien: "La plataforma", t: "Recibes tu lectura personal", d: "Al terminar, la plataforma te muestra dónde ves más avance, dónde más distancia y qué preguntas llevar a la conversación." },
      { icono: "SearchCheck", quien: "Tu asesor", t: "Tu asesor verifica la evidencia", d: "Revisa los documentos, el uso y los indicadores de cada práctica, asigna el nivel con la rúbrica y publica la medición." },
      { icono: "FileBarChart", quien: "La plataforma", t: "Llega el informe de resultados", d: "Niveles, brechas con su causa, comparación con la industria, preparación para inteligencia artificial, prioridades y ruta, con gráficas y descarga en PDF." },
    ],
    duracion: "Responder la percepción toma unos diez minutos y se puede hacer por partes. La verificación de la evidencia la agenda el asesor con la organización.",
    recibes: [
      { icono: "Eye", t: "Tu lectura personal de la percepción, apenas la completas." },
      { icono: "Layers", t: "El nivel de madurez por frente y por dimensión, con su meta." },
      { icono: "Scale", t: "La distancia entre percepción y evidencia, práctica por práctica." },
      { icono: "Building2", t: "La comparación con las empresas de la industria, con la fuente de cada dato." },
      { icono: "Bot", t: "El índice de preparación para inteligencia artificial y sus condiciones." },
      { icono: "Route", t: "Prioridades con primer paso, plazo, esfuerzo e impacto, y una ruta a doce meses." },
    ],
    usos: [
      { icono: "Wallet", t: "Decidir en qué invertir primero", d: "Las prioridades llegan ordenadas por esfuerzo e impacto. Sirven para aprobar el presupuesto digital del año y para decidir qué no hacer todavía." },
      { icono: "Handshake", t: "Poner a la dirección de acuerdo", d: "Una misma lectura, sostenida con evidencia, reemplaza la discusión de opiniones entre áreas sobre qué tan avanzada está la organización." },
      { icono: "ScanSearch", t: "Corregir lo que se cree", d: "Las brechas muestran dónde la organización se siente más avanzada de lo que demuestra y dónde tiene prácticas que nadie conoce y conviene comunicar." },
      { icono: "TrendingUp", t: "Medir el avance", d: "La primera medición queda como línea de base. Al repetirla, el informe muestra cuánto avanzó cada frente respecto de su meta." },
      { icono: "Bot", t: "Saber si la organización está lista para la inteligencia artificial", d: "El índice de preparación y sus condiciones muestran qué falta resolver en datos, gobierno y talento antes de ampliar su uso." },
      { icono: "Presentation", t: "Hablar con la junta y con aliados", d: "La comparación con la industria, con la fuente de cada dato, da contexto para sustentar un plan ante la junta, un inversionista o un cliente corporativo." },
    ],
    noEs: [
      { t: "No es una certificación ni una auditoría", d: "No otorga un sello ni revisa el cumplimiento de una norma." },
      { t: "No califica personas ni áreas", d: "Lee prácticas de la organización." },
      { t: "No reemplaza la decisión de la dirección", d: "Ordena la información para tomarla." },
    ],
    responde: [
      { icono: "Users", t: "Quién responde", d: "Quien recibe el código responde la percepción. Si más personas de la organización van a participar, el asesor las agrega al mismo espacio y el resultado promedia sus respuestas." },
      { icono: "Briefcase", t: "Qué necesitas", d: "Conocer cómo funciona hoy la organización. La percepción no exige preparar documentos; la evidencia la revisa después el asesor contigo." },
      { icono: "Lock", t: "Qué pasa con tus datos", d: "Tu nombre y tu correo se usan solo para el diagnóstico de tu organización. Las respuestas se leen como un promedio de la organización, no como una evaluación de la persona." },
    ],
    asunto: "Código para el diagnóstico de madurez en transformación digital",
  },
  {
    slug: "test-de-capacidades",
    corto: "Test de capacidades",
    titulo: "Test de capacidades",
    bajada: "Veinticinco preguntas sobre cómo funciona hoy la empresa. En una sola sesión entrega un informe de una página con la lectura de sus capacidades y el desafío que domina.",
    resumen: "Veinticinco preguntas sobre cómo funciona la empresa. El resultado es un informe de una página con la lectura de sus capacidades y el desafío que domina hoy.",
    cifras: [
      { valor: "25", rotulo: "preguntas" },
      { valor: "1", rotulo: "sesión para responderlo" },
      { valor: "1 página", rotulo: "de informe" },
      { valor: "2", rotulo: "prioridades como máximo" },
    ],
    proposito: [
      { icono: "ScanSearch", t: "Tener un primer retrato", d: "Una lectura rápida de las capacidades con las que la empresa dirige, lidera, ejecuta y crece, antes de un diagnóstico más profundo." },
      { icono: "Flag", t: "Nombrar el desafío que domina", d: "El test identifica la etapa en la que está la empresa y la contrasta con el desafío que señalas como el más urgente." },
      { icono: "Crosshair", t: "Concentrar la conversación", d: "El informe propone como máximo dos prioridades: lo que conviene verificar primero, no una lista de todo lo que se podría mejorar." },
      { icono: "Signpost", t: "Decidir el siguiente paso", d: "Es la puerta de entrada. Con el resultado, la dirección y el asesor deciden si conviene el diagnóstico completo." },
    ],
    pasos: [
      { icono: "KeyRound", quien: "Tú", t: "Registras tu organización", d: "Con el código que te envía tu asesor escribes el nombre, el sector y la ciudad. La plataforma crea el espacio de la organización." },
      { icono: "Target", quien: "Tú", t: "Escribes tu cargo y el objetivo de crecimiento", d: "Antes de las preguntas indicas tu cargo y el objetivo de crecimiento de la empresa a doce meses. El informe se lee frente a ese objetivo." },
      { icono: "ClipboardList", quien: "Tú", t: "Respondes las veinticinco preguntas", d: "Veinticuatro preguntas que valoras de 1 a 5, con la opción «Sin información», y una final sobre el desafío que hoy domina. El test se guarda al enviarlo." },
      { icono: "FileBarChart", quien: "La plataforma", t: "Recibes el informe de una página", d: "El perfil de capacidades, la etapa en la que está la empresa, el desafío que señalaste y hasta dos prioridades, listo para imprimir o guardar en PDF." },
    ],
    duracion: "Responderlo toma unos veinte minutos. Se guarda al enviarlo, así que conviene hacerlo de una sola vez.",
    recibes: [
      { icono: "ChartNoAxesColumn", t: "El perfil de las capacidades de la empresa, con su cobertura." },
      { icono: "Milestone", t: "La etapa en la que está hoy y el desafío que la domina." },
      { icono: "GitCompareArrows", t: "El contraste entre lo que muestran tus respuestas y el desafío que señalaste." },
      { icono: "ListChecks", t: "Hasta dos prioridades para verificar con evidencia." },
      { icono: "Printer", t: "Un informe de una página para imprimir o guardar en PDF." },
    ],
    usos: [
      { icono: "Crosshair", t: "Elegir un foco", d: "Una etapa y como máximo dos prioridades. Sirve para decidir en qué concentrar los próximos noventa días en lugar de abrir diez frentes." },
      { icono: "Compass", t: "Atacar el problema correcto", d: "El contraste entre el desafío que se siente y el que muestran las respuestas evita, por ejemplo, invertir en crecer cuando lo que falta es delegar." },
      { icono: "MessagesSquare", t: "Abrir la conversación directiva", d: "Cuando lo responden la gerencia y dos directivos, las diferencias de dos o más puntos entre sus respuestas no se promedian: se conversan." },
      { icono: "FileCheck2", t: "Saber qué pedir como evidencia", d: "Cada pregunta trae lo que la demostraría. El informe deja claro qué habría que mostrar para confirmar cada nota." },
      { icono: "Signpost", t: "Decidir el siguiente paso", d: "Con el resultado, la dirección y el asesor deciden si conviene el diagnóstico completo, que contrasta al equipo directivo, a los equipos y la evidencia." },
      { icono: "Shield", t: "Proteger el foco", d: "El informe termina en una acción a noventa días y en lo que la empresa no necesita ahora: las iniciativas que conviene posponer." },
    ],
    noEs: [
      { t: "No es un diagnóstico completo", d: "Es la lectura de una persona, sin evidencia verificada." },
      { t: "No califica a la gerencia ni al equipo", d: "Describe cómo funciona la empresa." },
      { t: "No es un veredicto", d: "La etapa y las prioridades son hipótesis que se confirman con evidencia." },
    ],
    responde: [
      { icono: "Users", t: "Quién responde", d: "Está pensado para la gerencia general y dos directivos. Cada persona lo responde por separado; el asesor puede agregar al espacio a quienes falten." },
      { icono: "Briefcase", t: "Qué necesitas", d: "Conocer la operación de la empresa. No requiere preparar información: si no tienes cómo responder una pregunta, la marcas «Sin información»." },
      { icono: "Lock", t: "Qué pasa con tus datos", d: "Tu nombre y tu correo se usan solo para el diagnóstico de tu organización. El resultado es una hipótesis de trabajo, no una calificación de las personas." },
    ],
    asunto: "Código para el test de capacidades",
  },
];

export const diagnosticoPublico = (slug: string) => DIAGNOSTICOS_PUBLICOS.find((d) => d.slug === slug) ?? null;

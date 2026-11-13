// Páginas públicas de los dos diagnósticos de entrada (/diagnosticos/<slug>): para qué sirve cada uno y cómo
// funciona. El texto describe lo que la plataforma hace hoy; si cambia el instrumento, se actualiza aquí.

export type DiagnosticoPublico = {
  slug: string; corto: string; titulo: string; bajada: string; resumen: string;
  cifras: { valor: string; rotulo: string }[];
  proposito: { t: string; d: string }[];
  pasos: { t: string; d: string }[];
  recibes: string[];
  responde: { t: string; d: string }[];
  asunto: string;   // asunto del correo de «Solicitar un código»
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
      { t: "Saber dónde está la organización", d: "Un nivel de madurez de 1 a 5 en cuatro frentes: clientes, canales y experiencia; operación y procesos; productos, servicios e innovación; y arquitectura y gobierno digital." },
      { t: "Separar lo que se cree de lo que se demuestra", d: "La percepción de las personas se contrasta con la evidencia de cada práctica: si está documentada, si se usa de verdad y si se mide su resultado." },
      { t: "Compararse con la industria", d: "La plataforma reúne hechos con fuente sobre el sector de la organización: cifras de adopción digital, iniciativas de otras empresas y exigencias regulatorias." },
      { t: "Decidir por dónde empezar", d: "El informe ordena las prioridades con su primer paso, su plazo, su esfuerzo y su impacto, y propone una ruta a doce meses." },
    ],
    pasos: [
      { t: "Usas tu código y registras tu organización", d: "Con el código que te envía tu asesor escribes el nombre, el sector y la ciudad de la organización. La plataforma crea su espacio y empieza a reunir información de su industria." },
      { t: "Respondes la percepción", d: "Cuarenta y ocho afirmaciones sobre prácticas concretas. Indicas qué tan de acuerdo estás, de 1 a 5, o marcas «No lo sé». Las respuestas se guardan a medida que avanzas y puedes retomarlas." },
      { t: "Recibes tu lectura personal", d: "Al completar la percepción, la plataforma te entrega una lectura de cómo ves hoy la organización: dónde ves más avance, dónde más distancia y qué preguntas llevar a la conversación." },
      { t: "Tu asesor verifica la evidencia", d: "El asesor revisa los documentos, el uso y los indicadores de cada práctica, asigna el nivel con una rúbrica frente a referentes internacionales y publica la medición." },
      { t: "Llega el informe de resultados", d: "Niveles por frente y por dimensión, brechas con su causa, comparación con la industria, preparación para inteligencia artificial, prioridades y ruta, con gráficas y descarga en PDF." },
    ],
    recibes: [
      "Tu lectura personal de la percepción, apenas la completas.",
      "El nivel de madurez por frente y por dimensión, con su meta.",
      "La distancia entre percepción y evidencia, práctica por práctica.",
      "La comparación con las empresas de la industria, con la fuente de cada dato.",
      "El índice de preparación para inteligencia artificial y sus condiciones.",
      "Prioridades con primer paso, plazo, esfuerzo e impacto, y una ruta a doce meses.",
    ],
    responde: [
      { t: "Quién responde", d: "Quien recibe el código responde la percepción. Si más personas de la organización van a participar, el asesor las agrega al mismo espacio y el resultado promedia sus respuestas." },
      { t: "Qué necesitas", d: "Conocer cómo funciona hoy la organización. No hace falta preparar documentos para la percepción; la evidencia la revisa después el asesor contigo." },
      { t: "Qué pasa con tus datos", d: "Tu nombre y tu correo se usan solo para el diagnóstico de tu organización. Las respuestas se leen como un promedio de la organización, no como una evaluación de la persona." },
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
      { t: "Tener un primer retrato", d: "Una lectura rápida de las capacidades con las que la empresa dirige, lidera, ejecuta y crece, antes de un diagnóstico más profundo." },
      { t: "Nombrar el desafío que domina", d: "El test identifica la etapa en la que está la empresa y la contrasta con el desafío que tú señalas como el más urgente." },
      { t: "Concentrar la conversación", d: "El informe propone como máximo dos prioridades: lo que conviene verificar primero, no una lista de todo lo que se podría mejorar." },
      { t: "Decidir el siguiente paso", d: "Sirve de puerta de entrada: con el resultado, la dirección y el asesor deciden si conviene el diagnóstico completo." },
    ],
    pasos: [
      { t: "Usas tu código y registras tu organización", d: "Con el código que te envía tu asesor escribes el nombre, el sector y la ciudad de la organización. La plataforma crea su espacio." },
      { t: "Escribes tu cargo y el objetivo de crecimiento", d: "Antes de las preguntas indicas tu cargo y el objetivo de crecimiento de la empresa a doce meses: el informe se lee frente a ese objetivo." },
      { t: "Respondes las veinticinco preguntas", d: "Veinticuatro afirmaciones que valoras de 1 a 5, con la opción «sin información», y una pregunta final sobre el desafío que hoy domina. El test se guarda al enviarlo: conviene responderlo de una vez." },
      { t: "Recibes el informe de una página", d: "El perfil de capacidades, la etapa en la que está la empresa, la hipótesis del desafío dominante y hasta dos prioridades, listo para imprimir o guardar en PDF." },
    ],
    recibes: [
      "El perfil de las capacidades de la empresa, con su cobertura.",
      "La etapa en la que está hoy y el desafío que la domina.",
      "El contraste entre lo que muestran tus respuestas y el desafío que señalaste.",
      "Hasta dos prioridades para verificar con evidencia.",
      "Un informe de una página para imprimir o guardar en PDF.",
    ],
    responde: [
      { t: "Quién responde", d: "Está pensado para la gerencia general y dos directivos. Cada persona lo responde por separado; el asesor puede agregar al espacio a quienes falten." },
      { t: "Qué necesitas", d: "Conocer la operación de la empresa. No requiere preparar información: si no tienes cómo responder una pregunta, la marcas «sin información»." },
      { t: "Qué pasa con tus datos", d: "Tu nombre y tu correo se usan solo para el diagnóstico de tu organización. El resultado es una hipótesis de trabajo, no una calificación de las personas." },
    ],
    asunto: "Código para el test de capacidades",
  },
];

export const diagnosticoPublico = (slug: string) => DIAGNOSTICOS_PUBLICOS.find((d) => d.slug === slug) ?? null;

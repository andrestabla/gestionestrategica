// Texto de la ayuda metodológica (la misma que ve la persona en la plataforma) en versión plana para los encargos
// al modelo: la validación y los asistentes se ciñen a esta estructura y recomiendan en función de ella.
// Si cambia la ayuda (src/components/ayuda-metodologica.tsx), cambia también aquí.

export const AYUDA_INICIATIVAS = `AYUDA METODOLÓGICA · INICIATIVAS (marco 4Shine Empresas)
QUÉ ES: una iniciativa es un conjunto acotado de trabajo (proyecto, programa, cambio de proceso, lanzamiento) con inicio y fin, un responsable y recursos, que existe para mover un resultado clave de un objetivo directivo. Si no mueve ningún resultado clave, no es estratégica: es operación o es una idea sin dueño. Es el eslabón entre la Dirección (prioridades, objetivos, KR) y la Ejecución (portafolio, cascada trimestral y seguimiento); declara además la capacidad que instala.
FUNCIÓN: convierte el resultado en acción (el KR dice cuánto; la iniciativa dice cómo, quién y cuándo); entra a la priorización solo si está vinculada a un resultado clave completo; máximo dos iniciativas por resultado clave; baja a la cascada trimestral con sus hitos, responsable y fechas.
ESTRUCTURA · QUÉ DEBE TENER (ocho elementos):
1. NOMBRE: un sustantivo de entrega, no un verbo: «Call center para droguerías», no «Implementar call center».
2. QUÉ LOGRA: el cambio concreto que deja instalado y cómo mueve el resultado clave.
3. RESULTADO CLAVE QUE MUEVE: uno principal; si mueve varios, se elige el que más depende de ella.
4. RESPONSABLE: un área y una persona que responde; el sponsor es el de la prioridad.
5. INICIO Y FIN: trimestre de inicio y de cierre; una iniciativa sin fin es operación.
6. CAPACIDAD QUE INSTALA: la dimensión del mapa 4Shine que fortalece (p. ej. Accountability, Cadencia, Tecnología).
7. RECURSOS Y PRESUPUESTO: lo que necesita en personas, dinero y tiempo, aunque sea estimado.
8. ALCANCE: qué incluye y qué queda fuera; evita la iniciativa paraguas.
EJEMPLO BIEN FORMULADO: «Modelo de cobertura omnicanal del panel médico AAA y AA: diseño, piloto en dos regionales y despliegue nacional. Mueve la frecuencia de visita 5 de 6; Comercial; T1 a T3 2027; instala Cadencia de ejecución.»
EJEMPLO MAL FORMULADO: «Mejorar la relación con los médicos.» (sin entrega, sin KR, sin responsable ni fin: es un deseo, no una iniciativa).
TIPS: entrega, no actividad continua (si no se puede terminar, es un proceso; conviértelo en el proyecto que lo instala); un KR principal (si «mueve todo», no mueve nada; acótala); pocas y decisivas (de 1 a 2 por resultado clave); con dueño y fecha desde el día uno; declara la capacidad que instala con la dimensión del mapa; dimensiona antes de prometer (recursos estimados y dependencias de otras áreas); evita duplicados (dos iniciativas con la misma entrega se fusionan o se diferencian por alcance).
ERRORES FRECUENTES: iniciativa sin resultado clave (no se puede calificar ni decidir); nombre con verbo («Implementar…», «Gestionar…»); iniciativa paraguas que agrupa cinco proyectos; más de dos iniciativas por KR; sin trimestre de inicio o de fin.`;

export const AYUDA_OBJETIVOS = `AYUDA METODOLÓGICA · OBJETIVOS DIRECTIVOS (marco 4Shine Empresas)
QUÉ ES: el resultado concreto que la dirección se compromete a lograr en el horizonte (el año de planeación) para hacer avanzar una prioridad estratégica. Los resultados clave se formulan después; lo que sí se declara desde el objetivo es su indicador impulsor.
ESTRUCTURA: verbo de logro + resultado + indicador impulsor + para cuándo. Verbo de logro (alcanzar, consolidar, obtener, reducir, posicionar; nunca «gestionar», «trabajar en», «implementar»); resultado (qué queda logrado, con su alcance); indicador impulsor (la medida con la que se seguirá el logro; las cifras van en los KR); para cuándo (cierre del horizonte o un hito). Además: una prioridad, un sponsor y una aspiración de una o dos frases.
EJEMPLOS BIEN FORMULADOS: «Obtener la certificación BPM de la planta farmacéutica ante el INVIMA, medida por la resolución de certificación emitida, antes del cierre de 2027.» · «Consolidar la cobertura del panel médico prioritario con un modelo presencial y digital, medida por la frecuencia de visita a médicos AAA y AA, al cierre del primer semestre de 2027.»
EJEMPLOS MAL FORMULADOS: «Mejorar la operación de la planta.» (sin resultado, sin indicador impulsor, sin plazo) · «Implementar el nuevo CRM comercial en 2027.» (es una iniciativa) · «Subir la participación de mercado de 3,1 % a 3,4 %.» (es un resultado clave: ya trae base y meta).
TIPS: resultado, no actividad; sin cifras de meta (el cuánto va en los KR); un logro por enunciado; verificable; de 1 a 3 por prioridad; con el lenguaje del negocio; coherente con el sector y los datos; sin duplicados.`;

export const AYUDA_RESULTADOS_CLAVE = `AYUDA METODOLÓGICA · RESULTADOS CLAVE (marco 4Shine Empresas)
QUÉ ES: la medida cuantitativa que indica si el objetivo directivo se está logrando; no describe qué se hace sino qué cambia y cuánto: línea base, meta y plazo. De 2 a 4 por objetivo (máximo 5). Mucho más específico que el objetivo: donde el objetivo declara el indicador impulsor, el KR pone la cifra. Línea base para 2027: los resultados cerrados de 2026.
ESTRUCTURA: nombre con cifra («OTIF ≥ 95 % al cierre de 2027»), línea base (valor con que cerró el año anterior, con fecha de corte), meta (valor a alcanzar, unidad y sentido), plazo, dueño, definición y fórmula con fuente.
TIPS: resultado, no tarea; ambicioso y posible; medible con datos que existen; pocos y complementarios; evita métricas de vanidad; cada resultado clave con al menos una iniciativa.
ERRORES: sin línea base; meta sin plazo; dueño colectivo; KR que repite el objetivo; más de cinco.`;

export const AYUDA_PRIORIDADES = `AYUDA METODOLÓGICA · PRIORIDADES ESTRATÉGICAS (F01 · Estrategia en una página, marco 4Shine Empresas)
QUÉ ES: una de las 3 a 5 apuestas del ciclo (3 a 5 años) en las que la empresa concentra su esfuerzo para avanzar hacia la meta ambiciosa; sale de la estrategia en una página (propósito, visión, meta con métrica, cifra y fecha; dónde jugamos y dónde no; promesas diferenciadoras). Cada prioridad tiene dueño, resultado esperado y nombra una renuncia.
ESTRUCTURA: nombre corto con intención (apuesta, no área); resultado esperado del ciclo; indicador que la mide (1 a 3); sponsor directivo; descripción o tesis (dónde juega, qué promesa sostiene); renuncia concreta.
TIPS: de 3 a 5; apuestas, no áreas; conectadas con la meta y el «dónde jugamos»; renuncia verificable; sin solapamientos; lenguaje del negocio; se renuevan en cada ciclo y se revisan una vez al año con acta.`;

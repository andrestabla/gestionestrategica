// Política de tratamiento de datos personales de Algoritmo T S.A.S. para la plataforma Gestión estratégica.
// Contenido mínimo según el artículo 2.2.2.25.3.1 del Decreto 1074 de 2015 (antes artículo 13 del Decreto 1377 de 2013).

import { PROVEEDOR, SUBENCARGADOS, type DocLegal } from "./base";

const P = PROVEEDOR;

export const POLITICA_TRATAMIENTO: DocLegal = {
  id: "tratamiento",
  titulo: "Política de tratamiento de datos personales",
  corto: "Tratamiento de datos",
  version: "2026-11-20",
  resumen: "Qué datos personales trata la plataforma, para qué, en calidad de qué, con quién se comparten, cuánto tiempo se conservan y cómo se ejercen los derechos de habeas data.",
  secciones: [
    {
      id: "identificacion", titulo: "1. Identificación del responsable",
      bloques: [
        `${P.razon}, sociedad colombiana identificada con NIT ${P.nit}, con domicilio en ${P.domicilio}, es la empresa que desarrolla, opera y presta el servicio de la plataforma ${P.producto} (${P.plataforma}).`,
        { lista: [
          `Correo para consultas y reclamos sobre datos personales: ${P.correo}.`,
          `Teléfono: ${P.telefono}.`,
          `Responsable de atender las solicitudes de los titulares: ${P.oficial}, ${P.cargoOficial.toLowerCase()}.`,
          `Sitio web: ${P.web}.`,
        ] },
      ],
    },
    {
      id: "marco", titulo: "2. Marco normativo y alcance",
      bloques: [
        "Esta política se rige por el artículo 15 de la Constitución Política, la Ley 1581 de 2012, el Decreto 1074 de 2015 (Capítulo 25 del Título 2 de la Parte 2 del Libro 2, que compila el Decreto 1377 de 2013) y las instrucciones de la Superintendencia de Industria y Comercio. Cuando la empresa cliente esté domiciliada en Ecuador, aplica además la Ley Orgánica de Protección de Datos Personales (2021) y su reglamento.",
        `Aplica a todos los datos personales que se recogen o se tratan en la plataforma ${P.producto}, en su sitio público y en los canales de atención asociados, y obliga a ${P.razon}, a sus empleados, contratistas y consultores vinculados, y a los proveedores que tratan datos por su cuenta.`,
      ],
    },
    {
      id: "definiciones", titulo: "3. Definiciones",
      bloques: [
        { lista: [
          "Titular: la persona natural cuyos datos personales son objeto de tratamiento.",
          "Responsable del tratamiento: quien decide sobre la base de datos o el tratamiento de los datos.",
          "Encargado del tratamiento: quien trata datos personales por cuenta del responsable.",
          "Empresa cliente: la organización que contrata la plataforma para su proceso de gestión estratégica.",
          "Transmisión: comunicación de datos al encargado, dentro o fuera de Colombia, para que los trate por cuenta del responsable.",
          "Transferencia: envío de datos a un receptor que actúa como responsable, dentro o fuera de Colombia.",
          "Dato sensible: el que afecta la intimidad del titular o cuyo uso indebido puede generar discriminación (origen racial o étnico, orientación política, convicciones religiosas, pertenencia a sindicatos, salud, vida sexual, datos biométricos, entre otros).",
        ] },
      ],
    },
    {
      id: "roles", titulo: "4. En qué calidad trata los datos Algoritmo T",
      bloques: [
        `La plataforma la usa cada empresa cliente para su propio proceso de planeación y seguimiento estratégico. Por eso ${P.razon} actúa en dos calidades distintas:`,
        { tabla: { cabeza: ["Calidad", "Datos", "Quién decide"], filas: [
          ["Encargado del tratamiento", "Los datos de las personas de la empresa cliente que participan en su proceso: cuentas de usuario, respuestas a diagnósticos, evaluaciones, comentarios, decisiones y su actividad en la plataforma.", "La empresa cliente es la responsable: define las finalidades, autoriza a quién se da acceso y obtiene las autorizaciones de sus colaboradores. Algoritmo T los trata solo por su cuenta y según sus instrucciones, en los términos del contrato de transmisión de datos firmado con ella."],
          ["Responsable del tratamiento", "Los datos de quienes solicitan un código o una demostración en el sitio público, de los contactos comerciales y contractuales de las empresas cliente, de los consultores y administradores de la plataforma, y los registros técnicos y de seguridad.", `${P.razon} decide sobre estos datos y responde por ellos según esta política.`],
        ] } },
      ],
    },
    {
      id: "datos", titulo: "5. Datos que se tratan",
      bloques: [
        { lista: [
          "Identificación y contacto: nombre, correo electrónico, cargo o rol, área o equipo y, si se entrega, teléfono.",
          "Datos de la cuenta: rol y permisos, fecha y versión de las autorizaciones aceptadas, preferencias, fecha del último ingreso. Las contraseñas no se conocen ni se guardan: se conserva solo su resumen criptográfico.",
          "Participación en el proceso: respuestas a los instrumentos de diagnóstico y de madurez, evaluaciones y calificaciones, comentarios, decisiones, tareas y entregables asignados, con su fecha y su autor.",
          "Encuesta de equipos: se responde por enlace anónimo, sin cuenta ni identificación de la persona; la plataforma solo guarda respuestas agregables.",
          "Datos de la solicitud de código o de demostración: nombre, empresa, industria, país, correo, teléfono opcional y cómo conoció el servicio.",
          "Registros técnicos y de seguridad: fecha y hora de los ingresos, intentos fallidos, cambios registrados en la auditoría de la empresa y registros técnicos del proveedor de alojamiento (dirección IP y navegador).",
        ] },
        "La plataforma no está diseñada para tratar datos sensibles ni datos de niñas, niños o adolescentes, y no los solicita. Las empresas cliente y sus usuarios se abstienen de cargarlos en campos de texto o archivos. Si por excepción se requiriera tratar un dato sensible, se pedirá una autorización explícita, informando que su entrega es facultativa.",
      ],
    },
    {
      id: "finalidades", titulo: "6. Finalidades",
      bloques: [
        "Como encargado, por cuenta de la empresa cliente, los datos se usan exclusivamente para:",
        { lista: [
          "Crear y administrar las cuentas, autenticar a las personas y controlar sus permisos según el rol que la empresa les asigna.",
          "Registrar y atribuir la participación de cada persona en el diagnóstico, la priorización, la planeación y el seguimiento estratégico de la empresa.",
          "Consolidar resultados, generar informes y tableros para la empresa y su equipo consultor.",
          "Enviar los avisos propios del servicio: accesos, códigos de verificación, recuperación de contraseña, asignaciones y recordatorios.",
          "Mantener la seguridad de la plataforma, la trazabilidad de los cambios y la atención de soporte.",
        ] },
        `Como responsable, ${P.razon} usa los datos para:`,
        { lista: [
          "Responder solicitudes de código, de demostración y de información, y gestionar la relación precontractual y contractual.",
          "Facturar, cumplir obligaciones legales, contables y tributarias y atender requerimientos de autoridades.",
          "Prevenir fraudes y accesos no autorizados, investigar incidentes y mejorar la seguridad del servicio.",
          "Elaborar estadísticas de uso del servicio sin identificar a las personas.",
          "Enviar información sobre sus servicios solo a quien lo haya autorizado expresamente; esa autorización puede retirarse en cualquier momento.",
        ] },
        `${P.razon} no vende, alquila ni cede datos personales; no los usa para perfilamiento comercial ni para publicidad de terceros, y no usa los datos de una empresa cliente para fines propios.`,
      ],
    },
    {
      id: "autorizacion", titulo: "7. Autorización del titular",
      bloques: [
        "El tratamiento se hace con autorización previa, expresa e informada del titular. En la plataforma la autorización se otorga al marcar la casilla de aceptación en el primer ingreso (o al entrar por código o QR), y queda registrada en la cuenta con la fecha y la versión de la política aceptada; esa constancia sirve como prueba de la autorización. Cuando se actualiza la política en un aspecto sustancial, se pide de nuevo la aceptación.",
        "En los datos que se tratan por cuenta de una empresa cliente, es ella quien debe contar con la autorización de sus colaboradores; la plataforma le facilita recogerla y conservar su prueba.",
        "No se requiere autorización en los casos del artículo 10 de la Ley 1581 de 2012: datos de naturaleza pública, requerimientos de autoridad en ejercicio de sus funciones, urgencias médicas o sanitarias, fines históricos, estadísticos o científicos, y datos relacionados con el Registro Civil.",
      ],
    },
    {
      id: "derechos", titulo: "8. Derechos de los titulares",
      bloques: [
        "De acuerdo con el artículo 8 de la Ley 1581 de 2012, el titular tiene derecho a:",
        { lista: [
          "Conocer, actualizar y rectificar sus datos personales.",
          "Solicitar prueba de la autorización otorgada.",
          "Ser informado, previa solicitud, del uso que se ha dado a sus datos.",
          "Presentar quejas ante la Superintendencia de Industria y Comercio, una vez agotado el trámite de consulta o reclamo ante el responsable o el encargado.",
          "Revocar la autorización y solicitar la supresión de sus datos cuando no se respeten los principios, derechos y garantías legales, salvo que exista un deber legal o contractual de conservarlos.",
          "Acceder en forma gratuita a sus datos personales objeto de tratamiento.",
        ] },
        "Desde «Mi perfil» la persona puede ver y actualizar sus datos básicos, cambiar su contraseña y eliminar su cuenta, lo que borra su información de la plataforma.",
      ],
    },
    {
      id: "procedimiento", titulo: "9. Procedimiento para consultas y reclamos",
      bloques: [
        `Las solicitudes se presentan por correo a ${P.correo}, indicando el nombre del titular, su correo de contacto, la empresa en cuya plataforma participa (si aplica), la descripción de lo que solicita y los documentos que quiera hacer valer. Pueden presentarlas el titular, sus causahabientes, su representante o apoderado acreditado.`,
        { lista: [
          "Consultas: se responden en un máximo de diez (10) días hábiles desde su recibo. Si no es posible en ese plazo, se informa el motivo y la nueva fecha, que no superará cinco (5) días hábiles adicionales.",
          "Reclamos (corrección, actualización, supresión o incumplimiento): se atienden en un máximo de quince (15) días hábiles desde el día siguiente a su recibo, prorrogables hasta por ocho (8) días hábiles informando el motivo. Si el reclamo está incompleto, se pide completarlo dentro de los cinco (5) días siguientes; si pasan dos (2) meses sin respuesta, se entiende desistido.",
          "Mientras se tramita un reclamo, el dato se marca como «reclamo en trámite» hasta su decisión.",
        ] },
        `Cuando la solicitud se refiere a datos que la plataforma trata por cuenta de una empresa cliente, ${P.razon} la traslada a esa empresa dentro de los cinco (5) días hábiles siguientes, informa al titular y colabora con ella para atenderla en los plazos legales.`,
      ],
    },
    {
      id: "terceros", titulo: "10. Con quién se comparten los datos",
      bloques: [
        "Dentro de la plataforma, cada persona ve solo lo que su rol le permite en su empresa. Los datos de una empresa no se comparten con otra.",
        `Para prestar el servicio, ${P.razon} se apoya en proveedores de infraestructura que tratan los datos por su cuenta (subencargados), con acuerdos de tratamiento de datos y medidas de seguridad equivalentes a las de esta política:`,
        { tabla: { cabeza: ["Proveedor", "Servicio", "Ubicación"], filas: SUBENCARGADOS.map((s) => [s.nombre, s.servicio, s.ubicacion]) } },
        "Estos envíos son transmisiones internacionales de datos a encargados, amparadas en contratos que obligan a tratarlos solo para prestar el servicio, con confidencialidad y medidas de seguridad (artículo 2.2.2.25.5.2 del Decreto 1074 de 2015). Los datos también pueden entregarse a autoridades que los requieran en ejercicio de sus funciones legales.",
      ],
    },
    {
      id: "seguridad", titulo: "11. Seguridad de la información",
      bloques: [
        `${P.razon} aplica medidas técnicas, humanas y administrativas para proteger los datos contra adulteración, pérdida, consulta, uso o acceso no autorizado: cifrado en tránsito y en reposo, control de acceso por roles, aislamiento entre empresas, contraseñas protegidas con resumen criptográfico, bloqueo ante intentos fallidos, cierre de sesión por inactividad, verificación en dos pasos disponible, registro de auditoría y compromisos de confidencialidad de todo el personal con acceso. El detalle está en la Política de seguridad de la información.`,
        "Si ocurre un incidente que comprometa datos personales, se atiende según el procedimiento de gestión de incidentes, se informa a la empresa cliente afectada sin demora injustificada y se reporta a la Superintendencia de Industria y Comercio cuando corresponda.",
      ],
    },
    {
      id: "conservacion", titulo: "12. Conservación y supresión",
      bloques: [
        { lista: [
          "Datos de la empresa cliente y de sus usuarios: mientras esté vigente el contrato de servicio. Al terminarlo, la empresa puede exportar su información durante los treinta (30) días siguientes; luego se eliminan de la base de datos y del almacenamiento de archivos, salvo instrucción distinta de la empresa o deber legal de conservarlos. Las copias de respaldo del proveedor se sobrescriben en su ciclo ordinario de retención.",
          "Cuenta de una persona: hasta que ella la elimine desde «Mi perfil» o la empresa la retire.",
          "Solicitudes de código o demostración: hasta veinticuatro (24) meses después del último contacto, salvo que exista relación contractual.",
          "Datos contractuales, contables y tributarios: por el término que exija la ley (diez años para los libros y papeles del comerciante).",
          "Registros de seguridad y auditoría: mientras exista la empresa en la plataforma, para la trazabilidad de sus decisiones.",
        ] },
      ],
    },
    {
      id: "cookies", titulo: "13. Cookies y almacenamiento en el navegador",
      bloques: [
        "La plataforma usa solo cookies técnicas, necesarias para su funcionamiento: la de sesión (firmada, inaccesible para los scripts del navegador y enviada solo por conexiones seguras) y la del paso de verificación en dos pasos. Guarda en el navegador preferencias como el tema de color o si la persona ya vio el tour guiado. No usa cookies de publicidad ni de analítica de terceros.",
      ],
    },
    {
      id: "vigencia", titulo: "14. Vigencia y cambios",
      bloques: [
        "Esta política rige desde el 20 de noviembre de 2026. Las bases de datos estarán vigentes mientras se preste el servicio y por los plazos de conservación descritos.",
        "Los cambios sustanciales se publicarán en gestionestrategica.io/privacidad y se informarán a los titulares antes de su aplicación, pidiendo de nuevo su aceptación en la plataforma cuando cambien las finalidades o los datos tratados.",
      ],
    },
  ],
};

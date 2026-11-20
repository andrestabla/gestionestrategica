// Acuerdo de confidencialidad bilateral entre Algoritmo T S.A.S. y la empresa cliente. Plantilla: los campos {{…}} se
// llenan con los datos de la empresa al descargarla desde Administración → Acuerdos.

import { PROVEEDOR, type DocLegal } from "./base";

const P = PROVEEDOR;

export const ACUERDO_CONFIDENCIALIDAD: DocLegal = {
  id: "confidencialidad",
  titulo: "Acuerdo de confidencialidad entre {{cliente}} y Algoritmo T S.A.S.",
  corto: "Acuerdo de confidencialidad",
  version: "2026-11-20",
  plantilla: true,
  resumen: "Acuerdo bilateral que protege la información estratégica, financiera y técnica que las partes intercambian en el proceso de gestión estratégica y en la plataforma.",
  secciones: [
    {
      id: "partes", titulo: "Partes",
      bloques: [
        "Entre los suscritos, {{cliente}}, sociedad identificada con NIT {{nit_cliente}}, con domicilio en {{domicilio_cliente}}, representada legalmente por {{representante_cliente}}, identificado(a) con documento {{documento_representante}} (en adelante, «la Empresa»), y",
        `${P.razon}, sociedad identificada con NIT ${P.nit}, con domicilio en ${P.domicilio}, representada legalmente por ${P.representante} (en adelante, «Algoritmo T»), conjuntamente «las Partes»,`,
        "celebran el presente acuerdo de confidencialidad, que se rige por las siguientes consideraciones y cláusulas.",
      ],
    },
    {
      id: "consideraciones", titulo: "Consideraciones",
      bloques: [
        { lista: [
          "La Empresa contrató a Algoritmo T para acompañar su proceso de gestión estratégica «{{proyecto}}» y para usar la plataforma Gestión estratégica, en la que registra su diagnóstico, prioridades, objetivos, resultados clave, iniciativas, proyectos, presupuestos e indicadores.",
          "Para ese fin las Partes intercambiarán información que tiene valor comercial y estratégico, cuya divulgación causaría perjuicios a quien la entrega.",
          "Las Partes desean fijar las condiciones en que esa información se recibe, se usa y se protege.",
        ] },
      ],
    },
    {
      id: "c1", titulo: "Cláusula primera. Información confidencial",
      bloques: [
        "Es información confidencial toda información, en cualquier forma o medio (oral, escrita, electrónica, en la plataforma o en reuniones), que una Parte entregue a la otra o a la que esta tenga acceso con ocasión del servicio, en particular:",
        { lista: [
          "De la Empresa: su estrategia, planes, prioridades, objetivos, metas, resultados clave, iniciativas y decisiones de portafolio; sus cifras financieras, presupuestos, costos, márgenes y proyecciones; información de clientes, proveedores, productos, precios y mercado; los resultados de los diagnósticos, encuestas e informes; la información de sus colaboradores; y todo dato registrado en su espacio de la plataforma.",
          "De Algoritmo T: el software de la plataforma, su código, arquitectura, configuración y credenciales; sus metodologías, instrumentos de medición, modelos, bases de conocimiento y plantillas; y sus condiciones comerciales.",
        ] },
        "La información se considera confidencial aunque no esté marcada como tal, cuando por su naturaleza o por las circunstancias de su entrega una persona razonable la entendería así.",
      ],
    },
    {
      id: "c2", titulo: "Cláusula segunda. Exclusiones",
      bloques: [
        "No es información confidencial la que la Parte receptora demuestre que: (a) era de dominio público al recibirla o lo es después sin culpa suya; (b) ya conocía legítimamente antes de recibirla, sin obligación de reserva; (c) recibió de un tercero autorizado para entregarla sin reserva; o (d) desarrolló de manera independiente sin usar la información de la otra Parte.",
        "Si una autoridad judicial o administrativa exige revelar información confidencial, la Parte requerida avisará a la otra de inmediato (cuando la ley lo permita), revelará solo lo estrictamente exigido y procurará que se mantenga la reserva.",
      ],
    },
    {
      id: "c3", titulo: "Cláusula tercera. Obligaciones de la Parte receptora",
      bloques: [
        { lista: [
          "Usar la información confidencial solo para la ejecución del servicio y no para fines propios o de terceros.",
          "No divulgarla, publicarla, venderla ni cederla a terceros sin autorización previa y escrita de la Parte que la entregó.",
          "Darla a conocer solo a sus empleados, contratistas y consultores que necesiten conocerla para el servicio, que estén informados de su carácter confidencial y que hayan asumido obligaciones de reserva al menos tan exigentes como las de este acuerdo. La Parte responde por el incumplimiento de esas personas.",
          "Protegerla con medidas de seguridad no inferiores a las que usa para su propia información confidencial y, en todo caso, razonables según su naturaleza. Algoritmo T aplica además su Política de seguridad de la información.",
          "No copiarla ni reproducirla más allá de lo necesario para el servicio.",
          "Avisar de inmediato a la otra Parte si conoce un uso o una divulgación no autorizados, y colaborar para contenerlos.",
        ] },
      ],
    },
    {
      id: "c4", titulo: "Cláusula cuarta. Compromisos específicos de Algoritmo T sobre la plataforma",
      bloques: [
        { lista: [
          "La información que la Empresa registra en la plataforma es de su propiedad. Algoritmo T no la usa para fines propios ni la comparte con otras empresas cliente; no la incluye en bases de conocimiento, comparativos o estadísticas de terceros, salvo de forma agregada y anónima de manera que no permita identificar a la Empresa, y solo si la Empresa lo autoriza por escrito.",
          "Solo acceden a la información de la Empresa las cuentas que ella autoriza y el equipo consultor asignado a su proceso, con el rol que corresponda. El acceso del personal técnico de Algoritmo T se limita a lo necesario para soporte, mantenimiento o seguridad.",
          "Los proveedores de infraestructura que tratan la información (alojamiento, base de datos, archivos, correo e inteligencia artificial) son los publicados en la Política de seguridad de la información y están obligados a confidencialidad. Todo cambio de proveedor se informa con treinta (30) días de anticipación.",
          "Los incidentes de seguridad que afecten la información de la Empresa se le informan dentro de las setenta y dos (72) horas siguientes a su confirmación.",
        ] },
      ],
    },
    {
      id: "c5", titulo: "Cláusula quinta. Datos personales",
      bloques: [
        "Cuando la información confidencial incluya datos personales, las Partes cumplirán la Ley 1581 de 2012 y sus decretos reglamentarios. La Empresa actúa como responsable y Algoritmo T como encargado del tratamiento, en los términos del contrato de transmisión de datos personales que las Partes suscriben junto con este acuerdo.",
      ],
    },
    {
      id: "c6", titulo: "Cláusula sexta. Propiedad intelectual",
      bloques: [
        "La entrega de información confidencial no transfiere derechos sobre ella. La Empresa conserva la propiedad de su información y de los productos derivados de su proceso (informes, diagnósticos, planes y tableros). Algoritmo T conserva la propiedad de la plataforma, su software, sus metodologías e instrumentos, que la Empresa usa bajo licencia durante el servicio.",
      ],
    },
    {
      id: "c7", titulo: "Cláusula séptima. Devolución y destrucción",
      bloques: [
        "Al terminar el servicio o a solicitud escrita de la Parte que la entregó, la receptora devolverá o destruirá la información confidencial y sus copias. En el caso de la plataforma, la Empresa podrá descargar su información durante los treinta (30) días siguientes a la terminación; luego Algoritmo T la eliminará de la base de datos y del almacenamiento de archivos y lo certificará por escrito. Se exceptúan las copias que la ley obligue a conservar y las copias de respaldo automáticas, que se mantienen bajo reserva hasta su sobrescritura.",
      ],
    },
    {
      id: "c8", titulo: "Cláusula octava. Vigencia",
      bloques: [
        "Este acuerdo rige desde su firma y durante toda la relación entre las Partes. Las obligaciones de confidencialidad se mantienen por cinco (5) años después de su terminación; para los secretos empresariales y los datos personales, mientras la información conserve ese carácter.",
      ],
    },
    {
      id: "c9", titulo: "Cláusula novena. Incumplimiento",
      bloques: [
        "El incumplimiento de este acuerdo faculta a la Parte afectada para exigir la indemnización de los perjuicios que demuestre, sin perjuicio de las acciones por competencia desleal y violación de secretos (Ley 256 de 1996, artículo 16; Decisión 486 de 2000 de la Comunidad Andina, artículos 260 a 266) y de las acciones penales que correspondan.",
      ],
    },
    {
      id: "c10", titulo: "Cláusula décima. Disposiciones generales",
      bloques: [
        { lista: [
          "Este acuerdo no obliga a las Partes a celebrar otros contratos ni crea entre ellas sociedad, agencia ni relación laboral.",
          "Ninguna Parte puede ceder este acuerdo sin autorización escrita de la otra.",
          "Las controversias se resolverán primero por arreglo directo durante treinta (30) días; si no hay acuerdo, ante los jueces competentes de la República de Colombia.",
          "Las Partes aceptan la firma electrónica de este acuerdo conforme a la Ley 527 de 1999 y al Decreto 2364 de 2012 (compilado en el Decreto 1074 de 2015).",
          "Notificaciones: para la Empresa, {{correo_cliente}}; para Algoritmo T, " + P.correo + ".",
        ] },
        "En constancia, se firma en {{ciudad_cliente}} el {{fecha}}.",
      ],
    },
  ],
  firmas: [
    { parte: "Por la Empresa · {{cliente}}", campos: ["Nombre: {{representante_cliente}}", "Documento: {{documento_representante}}", "Cargo: Representante legal"] },
    { parte: `Por ${P.razon}`, campos: [`Nombre: ${P.representante}`, "Documento: __________________", "Cargo: Representante legal"] },
  ],
};

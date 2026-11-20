// Contrato de transmisión de datos personales (encargo del tratamiento) entre la empresa cliente, responsable, y
// Algoritmo T S.A.S., encargado. Exigido por el artículo 2.2.2.25.5.2 del Decreto 1074 de 2015 (antes artículo 25
// del Decreto 1377 de 2013) para transmitir datos al encargado sin informar al titular ni pedir su consentimiento.

import { PROVEEDOR, SUBENCARGADOS, type DocLegal } from "./base";

const P = PROVEEDOR;

export const CONTRATO_TRANSMISION: DocLegal = {
  id: "transmision",
  titulo: "Contrato de transmisión de datos personales entre {{cliente}} y Algoritmo T S.A.S.",
  corto: "Contrato de transmisión de datos",
  version: "2026-11-20",
  plantilla: true,
  resumen: "Encargo del tratamiento: la empresa cliente es responsable de los datos de sus colaboradores y Algoritmo T los trata solo por su cuenta, con las obligaciones, la seguridad y los subencargados que fija la ley.",
  secciones: [
    {
      id: "partes", titulo: "Partes",
      bloques: [
        "{{cliente}}, sociedad identificada con NIT {{nit_cliente}}, con domicilio en {{domicilio_cliente}}, representada legalmente por {{representante_cliente}} (en adelante, «el Responsable»), y",
        `${P.razon}, sociedad identificada con NIT ${P.nit}, con domicilio en ${P.domicilio}, representada legalmente por ${P.representante} (en adelante, «el Encargado»),`,
        "celebran el presente contrato de transmisión de datos personales, en los términos del artículo 2.2.2.25.5.2 del Decreto 1074 de 2015, que se rige por las siguientes cláusulas.",
      ],
    },
    {
      id: "c1", titulo: "Cláusula primera. Objeto",
      bloques: [
        "El Responsable transmite al Encargado, y este trata por su cuenta, los datos personales de los colaboradores y participantes del proceso de gestión estratégica del Responsable que se registran en la plataforma Gestión estratégica, con el alcance, las finalidades y las condiciones descritas en este contrato y en su Anexo 1.",
      ],
    },
    {
      id: "c2", titulo: "Cláusula segunda. Alcance y finalidades del tratamiento",
      bloques: [
        "El Encargado tratará los datos solo para:",
        { lista: [
          "Crear y administrar las cuentas de las personas que el Responsable autorice, autenticarlas y aplicar los permisos del rol que este les asigne.",
          "Registrar y atribuir su participación en el diagnóstico, la priorización, la planeación y el seguimiento estratégico del Responsable.",
          "Consolidar resultados y generar los informes y tableros del servicio.",
          "Enviar los avisos propios del servicio (accesos, códigos de verificación, recuperación de contraseña, asignaciones y recordatorios).",
          "Mantener la seguridad, la auditoría y el soporte de la plataforma.",
        ] },
        "Cualquier tratamiento distinto exige instrucción previa y escrita del Responsable.",
      ],
    },
    {
      id: "c3", titulo: "Cláusula tercera. Obligaciones del Responsable",
      bloques: [
        { lista: [
          "Contar con la autorización previa, expresa e informada de los titulares para el tratamiento y conservar su prueba. La plataforma registra la aceptación de cada persona con fecha y versión, y el Responsable puede consultar ese registro.",
          "Informar a los titulares la finalidad del tratamiento y sus derechos, y atender sus consultas y reclamos.",
          "Dar al Encargado instrucciones lícitas y documentadas, y asegurarse de que los datos que se cargan sean veraces, completos, actualizados y no incluyan datos sensibles ni de menores de edad.",
          "Definir quién tiene cuenta y con qué rol, y retirar oportunamente las cuentas de quienes dejan el proceso.",
        ] },
      ],
    },
    {
      id: "c4", titulo: "Cláusula cuarta. Obligaciones del Encargado",
      bloques: [
        "Además de los deberes del artículo 18 de la Ley 1581 de 2012, el Encargado se obliga a:",
        { lista: [
          "Tratar los datos solo según las instrucciones del Responsable y las finalidades de este contrato, aplicando los principios de la Ley 1581 de 2012 y la política de tratamiento del Responsable en lo que le corresponda.",
          "Garantizar la seguridad de los datos con las medidas técnicas, humanas y administrativas del Anexo 3, que impiden su adulteración, pérdida, consulta, uso o acceso no autorizado o fraudulento.",
          "Guardar confidencialidad sobre los datos, aun después de terminado el contrato, y exigirla a toda persona que intervenga en su tratamiento.",
          "Dar acceso a los datos solo a su personal y consultores que lo necesiten para el servicio, que hayan firmado compromisos de confidencialidad.",
          "No vender, ceder, transferir ni usar los datos para fines propios o de terceros.",
          "Trasladar al Responsable, dentro de los cinco (5) días hábiles siguientes a su recibo, toda consulta o reclamo de un titular, y apoyarlo para atenderlo en los plazos legales; registrar la leyenda «reclamo en trámite» o «información en discusión judicial» cuando corresponda.",
          "Actualizar, rectificar o suprimir los datos cuando el Responsable lo solicite, dentro de los cinco (5) días hábiles siguientes.",
          "Informar a la Superintendencia de Industria y Comercio, y al Responsable, las violaciones a los códigos de seguridad y los riesgos en la administración de los datos, según la cláusula séptima.",
          "Abstenerse de circular información que esté siendo controvertida por el titular y cuyo bloqueo haya ordenado la Superintendencia.",
        ] },
      ],
    },
    {
      id: "c5", titulo: "Cláusula quinta. Subencargados",
      bloques: [
        "El Responsable autoriza al Encargado para apoyarse en los proveedores de infraestructura del Anexo 2. El Encargado celebra con cada uno acuerdos que les imponen obligaciones de confidencialidad y seguridad no inferiores a las de este contrato, y responde frente al Responsable por su cumplimiento.",
        "El Encargado informará al Responsable, con al menos treinta (30) días de anticipación, la incorporación o el reemplazo de un subencargado. El Responsable podrá oponerse por razones justificadas de protección de datos; si no se llega a una solución, podrá terminar el servicio sin penalidad.",
      ],
    },
    {
      id: "c6", titulo: "Cláusula sexta. Transmisión internacional",
      bloques: [
        "El Responsable conoce y autoriza que los datos se alojen y procesen en la infraestructura de los subencargados ubicada fuera de Colombia (Brasil y Estados Unidos, según el Anexo 2). Esta transmisión se ampara en el presente contrato y en los acuerdos del Encargado con cada subencargado, conforme al artículo 2.2.2.25.5.2 del Decreto 1074 de 2015.",
      ],
    },
    {
      id: "c7", titulo: "Cláusula séptima. Incidentes de seguridad",
      bloques: [
        "El Encargado notificará al Responsable todo incidente que comprometa los datos sin demora injustificada y a más tardar dentro de las setenta y dos (72) horas siguientes a su confirmación, indicando, en lo posible: la naturaleza del incidente, las categorías y el número aproximado de titulares y registros afectados, las consecuencias probables, las medidas adoptadas o propuestas y un punto de contacto. Lo apoyará en el reporte a la Superintendencia de Industria y Comercio y en la comunicación a los titulares cuando corresponda.",
      ],
    },
    {
      id: "c8", titulo: "Cláusula octava. Verificación",
      bloques: [
        "El Encargado pondrá a disposición del Responsable la información razonable que demuestre el cumplimiento de este contrato. Una vez al año, o tras un incidente, el Responsable podrá verificarlo con un aviso de quince (15) días, en horario hábil, sin afectar la seguridad ni la confidencialidad de otras empresas cliente; cada Parte asume sus costos.",
      ],
    },
    {
      id: "c9", titulo: "Cláusula novena. Duración, devolución y supresión",
      bloques: [
        "Este contrato rige mientras el Encargado preste el servicio al Responsable. Al terminar, el Responsable podrá descargar sus datos durante treinta (30) días; vencido ese plazo, el Encargado los suprimirá de la base de datos y del almacenamiento de archivos y lo certificará por escrito, salvo que una norma exija conservarlos. Las copias de respaldo automáticas se mantienen bajo reserva hasta su sobrescritura en el ciclo ordinario del proveedor.",
      ],
    },
    {
      id: "c10", titulo: "Cláusula décima. Responsabilidad y disposiciones generales",
      bloques: [
        { lista: [
          "Cada Parte responde por los perjuicios que cause por el incumplimiento de sus obligaciones bajo este contrato y bajo la ley.",
          "Este contrato complementa el acuerdo de confidencialidad y el contrato de servicio entre las Partes; en lo relativo a datos personales prevalece este contrato.",
          "Las Partes aceptan su firma electrónica conforme a la Ley 527 de 1999.",
          "Notificaciones: para el Responsable, {{correo_cliente}}; para el Encargado, " + P.correo + ".",
        ] },
        "En constancia, se firma en {{ciudad_cliente}} el {{fecha}}.",
      ],
    },
    {
      id: "anexo1", titulo: "Anexo 1. Descripción del tratamiento",
      bloques: [
        { tabla: { cabeza: ["Aspecto", "Descripción"], filas: [
          ["Titulares", "Colaboradores, directivos, miembros de junta y demás participantes del proceso de gestión estratégica del Responsable que este registre o autorice."],
          ["Datos", "Nombre, correo electrónico, cargo o rol, área o equipo; respuestas a diagnósticos, evaluaciones, calificaciones, comentarios, decisiones, tareas y entregables con su autor y fecha; registros de acceso y auditoría. La encuesta de equipos se responde sin identificación. No incluye datos sensibles ni de menores de edad."],
          ["Operaciones", "Recolección, registro, almacenamiento, consulta, consolidación, presentación en informes, envío de avisos por correo, actualización y supresión."],
          ["Medios", "Plataforma web Gestión estratégica (gestionestrategica.io) y sus subencargados."],
          ["Duración", "Mientras se preste el servicio, más los treinta (30) días de descarga posteriores a su terminación."],
        ] } },
      ],
    },
    {
      id: "anexo2", titulo: "Anexo 2. Subencargados autorizados",
      bloques: [
        { tabla: { cabeza: ["Proveedor", "Servicio", "Datos", "Ubicación"], filas: SUBENCARGADOS.map((s) => [s.nombre, s.servicio, s.datos, s.ubicacion]) } },
      ],
    },
    {
      id: "anexo3", titulo: "Anexo 3. Medidas de seguridad",
      bloques: [
        "El Encargado aplica las medidas de su Política de seguridad de la información (gestionestrategica.io/seguridad), entre ellas:",
        { lista: [
          "Cifrado en tránsito (HTTPS con TLS 1.2 o superior) y en reposo (AES-256) de la base de datos y los archivos; credenciales de integración cifradas.",
          "Control de acceso por roles aplicado en el servidor, aislamiento entre empresas y cuentas personales e intransferibles.",
          "Contraseñas con resumen criptográfico, bloqueo tras intentos fallidos, verificación en dos pasos disponible, cierre de sesión por inactividad y revalidación de la sesión en cada petición.",
          "Registro de auditoría de los cambios por empresa.",
          "Cabeceras de seguridad, protección contra falsificación de peticiones y validación de entradas en el servidor.",
          "Compromisos de confidencialidad del personal, mínimo privilegio y retiro de accesos al terminar la vinculación.",
          "Respaldos automáticos de la base de datos y procedimiento de gestión de incidentes.",
        ] },
      ],
    },
  ],
  firmas: [
    { parte: "El Responsable · {{cliente}}", campos: ["Nombre: {{representante_cliente}}", "Documento: {{documento_representante}}", "Cargo: Representante legal"] },
    { parte: `El Encargado · ${P.razon}`, campos: [`Nombre: ${P.representante}`, "Documento: __________________", "Cargo: Representante legal"] },
  ],
};

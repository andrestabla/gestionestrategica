// Política de seguridad de la información de la plataforma Gestión estratégica. Describe los controles que la
// plataforma aplica de verdad (ver next.config.ts, src/lib/session.ts, src/server/store.ts, src/lib/permissions.ts);
// toma como referencia los dominios de la norma ISO/IEC 27001:2022, sin declarar una certificación.

import { PROVEEDOR, SUBENCARGADOS, type DocLegal } from "./base";

const P = PROVEEDOR;

export const POLITICA_SEGURIDAD: DocLegal = {
  id: "seguridad",
  titulo: "Política de seguridad de la información",
  corto: "Seguridad de la información",
  version: "2026-11-20",
  resumen: "Cómo se protege la información estratégica, financiera y personal de las empresas en la plataforma: principios, controles técnicos y organizacionales, proveedores, continuidad e incidentes.",
  secciones: [
    {
      id: "objetivo", titulo: "1. Objetivo y alcance",
      bloques: [
        `En la plataforma ${P.producto} las empresas registran información estratégica, financiera y de desempeño que es confidencial: sus prioridades, objetivos, resultados, presupuestos, decisiones de portafolio y el diagnóstico de sus capacidades. Esta política fija cómo ${P.razon} protege esa información y los datos personales de quienes participan, para preservar su confidencialidad, integridad y disponibilidad.`,
        `Aplica a la plataforma (aplicación, base de datos, almacenamiento de archivos, correos y servicios de inteligencia artificial), a sus entornos de desarrollo y de producción, y a todas las personas con acceso: empleados, contratistas y consultores de ${P.razon} y de sus aliados vinculados a los proyectos. Toma como referencia los dominios de la norma ISO/IEC 27001:2022; no constituye una declaración de certificación.`,
      ],
    },
    {
      id: "principios", titulo: "2. Principios",
      bloques: [
        { lista: [
          "La información de cada empresa es de la empresa: se usa solo para prestarle el servicio, nunca para fines propios del proveedor ni de terceros.",
          "Mínimo privilegio: cada persona ve y hace solo lo que su rol exige, y el servidor lo comprueba en cada petición.",
          "Aislamiento: los datos de una empresa no son visibles desde otra.",
          "Seguridad por diseño: los controles se construyen en la plataforma y se prueban de forma automática antes de cada despliegue.",
          "Trazabilidad: los cambios relevantes quedan registrados con su autor y su fecha.",
          "Transparencia: los proveedores que tratan la información y su ubicación se publican y se informan antes de cambiarlos.",
        ] },
      ],
    },
    {
      id: "organizacion", titulo: "3. Organización y responsabilidades",
      bloques: [
        { lista: [
          `Responsable de seguridad y de protección de datos: ${P.oficial} (${P.correo}). Aprueba esta política, la revisa al menos una vez al año o ante un cambio relevante, y coordina la respuesta a incidentes.`,
          "Personal con acceso a la plataforma o a sus datos: firma un compromiso de confidencialidad antes de recibir acceso, recibe solo los permisos que su función exige y los pierde al terminar su vinculación.",
          "Empresa cliente: decide quién tiene cuenta en su espacio y con qué rol, retira oportunamente las cuentas de quienes dejan el proceso y custodia la información que exporta o descarga.",
          "Usuarios: protegen su contraseña, no comparten su cuenta, cierran sesión en equipos compartidos y reportan cualquier sospecha de acceso indebido.",
        ] },
      ],
    },
    {
      id: "clasificacion", titulo: "4. Clasificación de la información",
      bloques: [
        { tabla: { cabeza: ["Nivel", "Qué incluye", "Tratamiento"], filas: [
          ["Confidencial de la empresa", "Estrategia, objetivos, resultados clave, iniciativas, presupuestos, cifras financieras, diagnósticos, informes, decisiones y evidencias.", "Solo para las cuentas autorizadas de la empresa y el equipo consultor asignado. No se comparte fuera de ella sin su autorización escrita."],
          ["Dato personal", "Nombre, correo, cargo, rol y la participación atribuida a cada persona.", "Según la Política de tratamiento de datos personales; la encuesta de equipos se responde sin identificación."],
          ["Interna del servicio", "Configuración, registros técnicos, auditoría y credenciales de integración.", "Solo el administrador de la plataforma; las credenciales se guardan cifradas y no se muestran completas."],
          ["Pública", "Sitio público, metodología divulgada y políticas.", "Sin restricción."],
        ] } },
      ],
    },
    {
      id: "acceso", titulo: "5. Control de acceso e identidad",
      bloques: [
        { lista: [
          "Cuentas personales e intransferibles; no hay cuentas compartidas, salvo la cuenta de demostración de solo lectura, que no puede modificar nada.",
          "Roles con permisos definidos (administrador de la plataforma, consultor, líder de la empresa, responsable de ámbito y directivo) y cuentas de solo lectura. La matriz de permisos se aplica en el servidor en cada petición, no solo en la interfaz.",
          "Contraseñas de al menos diez caracteres, protegidas con un resumen criptográfico de una vía (bcrypt); nadie, ni el administrador, puede conocerlas.",
          "Bloqueo temporal de la cuenta tras ocho intentos fallidos y topes a la recuperación de contraseña y al envío de códigos.",
          "Verificación en dos pasos (código enviado al correo) que cada empresa puede activar para todas sus cuentas.",
          "La sesión vence a los treinta minutos sin actividad, se valida en cada petición (cuenta activa y rol vigente) y se cierra en todos los dispositivos cuando la persona cambia su contraseña o el administrador la fija.",
          "Enlaces de recuperación de un solo uso, con vigencia de sesenta minutos, guardados como resumen criptográfico.",
          "Los accesos por código o QR no abren cuentas con contraseña ni cuentas de consultor, de administración o de otra empresa.",
        ] },
      ],
    },
    {
      id: "aislamiento", titulo: "6. Aislamiento entre empresas",
      bloques: [
        "Cada empresa es un espacio independiente con su propia dirección (gestionestrategica.io/<empresa>). Toda petición se resuelve dentro de la empresa de la página que la origina y se comprueba que la cuenta pertenezca a ella. Estas reglas de acceso entre empresas están cubiertas por las pruebas automáticas que se corren antes de cada despliegue.",
      ],
    },
    {
      id: "cifrado", titulo: "7. Cifrado y protección de los datos",
      bloques: [
        { lista: [
          "En tránsito: todo el tráfico va cifrado con HTTPS (TLS 1.2 o superior); el navegador se obliga a usar solo conexiones seguras y la conexión a la base de datos exige TLS.",
          "En reposo: la base de datos y el almacenamiento de archivos están cifrados por sus proveedores (AES-256).",
          "Credenciales de integraciones (claves de API): se guardan cifradas con AES-256-GCM en la base y nunca se devuelven completas a la interfaz.",
          "Secretos de la aplicación (firma de sesiones, acceso a la base): se guardan como variables protegidas del entorno de producción, fuera del código.",
          "Los archivos se descargan con enlaces firmados de corta duración; no hay carpetas públicas.",
        ] },
      ],
    },
    {
      id: "aplicacion", titulo: "8. Seguridad de la aplicación",
      bloques: [
        { lista: [
          "Política de seguridad de contenido (CSP) que limita de dónde carga el navegador scripts, estilos y conexiones; la plataforma no puede incrustarse en sitios ajenos.",
          "Cabeceras de seguridad: HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy y Cross-Origin-Opener-Policy.",
          "Comprobación de origen en toda escritura (protección contra falsificación de peticiones entre sitios).",
          "Validación de toda entrada en el servidor; exportaciones CSV sin fórmulas ejecutables; logos SVG depurados de scripts; valores escapados en los correos; sin redirecciones abiertas.",
          "Las respuestas con datos de la empresa no se guardan en cachés intermedias ni en el navegador.",
          "Dependencias actualizadas y revisadas contra vulnerabilidades conocidas; los cambios se prueban con la batería automática antes de publicarse.",
        ] },
      ],
    },
    {
      id: "auditoria", titulo: "9. Registro y monitoreo",
      bloques: [
        "Cada empresa tiene un registro de auditoría con los cambios relevantes (quién, qué y cuándo): cuentas y roles, decisiones, calificaciones, indicadores, configuración y eliminaciones. Lo consultan el administrador de la plataforma y el equipo consultor de la empresa. Los errores y eventos técnicos se registran en el proveedor de alojamiento para su revisión.",
      ],
    },
    {
      id: "ia", titulo: "10. Inteligencia artificial",
      bloques: [
        "La asistencia con inteligencia artificial es opcional y la activa cada empresa. Cuando está activa, la plataforma envía al proveedor de IA la información de negocio necesaria para cada tarea (por ejemplo, los resultados agregados del diagnóstico y el contexto de la empresa para redactar un informe), nunca los correos ni los datos de contacto de las personas. El proveedor no usa esa información para entrenar sus modelos y la retiene hasta treinta días solo para control de abuso. Todo resultado de la IA se presenta como propuesta para la revisión del equipo.",
      ],
    },
    {
      id: "proveedores", titulo: "11. Proveedores",
      bloques: [
        "La plataforma se apoya en proveedores de infraestructura reconocidos, que tratan la información por cuenta de Algoritmo T con acuerdos de tratamiento de datos y certificaciones de seguridad propias:",
        { tabla: { cabeza: ["Proveedor", "Para qué", "Ubicación", "Garantías"], filas: SUBENCARGADOS.map((s) => [s.nombre, s.servicio, s.ubicacion, s.garantia]) } },
        "Antes de incorporar o reemplazar un proveedor que trate información de las empresas, se evalúan sus garantías y se informa a las empresas cliente con al menos treinta (30) días de anticipación.",
      ],
    },
    {
      id: "continuidad", titulo: "12. Respaldo y continuidad",
      bloques: [
        "La base de datos cuenta con respaldos automáticos y restauración a un punto en el tiempo dentro de la ventana de retención del plan contratado con el proveedor. La aplicación se publica desde un repositorio con control de versiones, lo que permite restaurar una versión anterior en minutos. Cada empresa puede descargar sus informes y sus datos en formatos abiertos (PDF, Excel, CSV) cuando lo necesite.",
      ],
    },
    {
      id: "incidentes", titulo: "13. Gestión de incidentes",
      bloques: [
        { lista: [
          "Cualquier persona que detecte un posible incidente (acceso indebido, pérdida o filtración de información, cuenta comprometida) lo reporta de inmediato a " + P.correo + ".",
          "El responsable de seguridad lo evalúa, lo contiene (por ejemplo, cerrando sesiones, bloqueando cuentas o rotando credenciales), investiga su causa y alcance y documenta lo ocurrido.",
          "Si el incidente afecta información o datos personales de una empresa cliente, se le informa sin demora injustificada y a más tardar dentro de las setenta y dos (72) horas siguientes a su confirmación, con lo que se sepa: naturaleza, datos afectados, medidas tomadas y recomendaciones.",
          "Se apoya a la empresa cliente, como responsable, en el reporte a la Superintendencia de Industria y Comercio y en la comunicación a los titulares cuando corresponda.",
          "Cada incidente cierra con las acciones para evitar que se repita.",
        ] },
      ],
    },
    {
      id: "personas", titulo: "14. Personas y formación",
      bloques: [
        "Antes de recibir acceso, toda persona del equipo de Algoritmo T y de los aliados vinculados firma el compromiso de confidencialidad y conoce esta política. Los accesos se revisan al menos cada seis meses y se retiran el mismo día en que termina la vinculación o el proyecto. Los equipos desde los que se administra la plataforma usan cifrado de disco, bloqueo de pantalla y sistema operativo actualizado.",
      ],
    },
    {
      id: "fin", titulo: "15. Devolución y eliminación al terminar el servicio",
      bloques: [
        "Al terminar el servicio, la empresa puede descargar su información durante treinta (30) días. Después se eliminan sus datos de la base y sus archivos del almacenamiento, y se le confirma por escrito. Las copias de respaldo del proveedor se sobrescriben en su ciclo ordinario de retención y no se restauran salvo orden de autoridad.",
      ],
    },
    {
      id: "cumplimiento", titulo: "16. Cumplimiento y revisión",
      bloques: [
        "El incumplimiento de esta política por parte del personal o de los contratistas da lugar a las medidas disciplinarias o contractuales que correspondan, sin perjuicio de las acciones legales (Ley 1273 de 2009, delitos informáticos). Esta política rige desde el 20 de noviembre de 2026 y se revisa al menos una vez al año.",
      ],
    },
  ],
};

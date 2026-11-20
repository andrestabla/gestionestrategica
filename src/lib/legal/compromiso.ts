// Compromiso individual de confidencialidad y uso aceptable: lo acepta cada persona con cuenta al entrar a la
// plataforma (queda registrado con fecha y versión) y lo firma, además, el personal de Algoritmo T y de los aliados
// consultores antes de recibir acceso a la información de una empresa.

import { PROVEEDOR, type DocLegal } from "./base";

const P = PROVEEDOR;

export const COMPROMISO_CONFIDENCIALIDAD: DocLegal = {
  id: "compromiso",
  titulo: "Compromiso de confidencialidad y uso aceptable",
  corto: "Compromiso de confidencialidad",
  version: "2026-11-20",
  resumen: "Lo que cada persona con acceso a la plataforma se compromete a cuidar: reserva de la información de la empresa, uso de su cuenta y reporte de incidentes.",
  secciones: [
    {
      id: "alcance", titulo: "1. A quién aplica",
      bloques: [
        `Aplica a toda persona con una cuenta en la plataforma ${P.producto}: colaboradores, directivos y miembros de junta de las empresas cliente, consultores y personal de ${P.razon} y de sus aliados. Se acepta al entrar por primera vez a la plataforma, y de nuevo cuando cambie, y queda registrado con fecha y versión en la cuenta.`,
      ],
    },
    {
      id: "reserva", titulo: "2. Reserva de la información",
      bloques: [
        "La información que veo en la plataforma pertenece a la empresa en cuyo espacio participo: su estrategia, objetivos, resultados, cifras financieras, presupuestos, diagnósticos, decisiones, informes y los aportes de otras personas. Me comprometo a:",
        { lista: [
          "Usarla solo para participar en el proceso de gestión estratégica de esa empresa, según mi rol.",
          "No divulgarla, copiarla, fotografiarla, reenviarla ni compartirla con personas ajenas al proceso, ni publicarla en redes, foros o herramientas externas (incluidos servicios de inteligencia artificial no autorizados por la empresa).",
          "Cuidar los informes y archivos que descargue, guardarlos solo en equipos y repositorios autorizados por la empresa y eliminarlos cuando ya no los necesite.",
          "Respetar la reserva de los aportes individuales de otras personas y de las respuestas anónimas de los equipos, sin intentar identificar a quien respondió.",
          "Mantener esta reserva aun después de dejar el proceso o la empresa.",
        ] },
      ],
    },
    {
      id: "cuenta", titulo: "3. Uso de mi cuenta",
      bloques: [
        { lista: [
          "Mi cuenta es personal e intransferible: no comparto mi contraseña ni mis códigos de verificación, y no dejo la sesión abierta en equipos compartidos.",
          "Uso una contraseña propia, de al menos diez caracteres, que no uso en otros servicios.",
          "No intento acceder a información o funciones que mi rol no permite, ni a espacios de otras empresas; no pruebo vulnerabilidades ni automatizo descargas masivas.",
          "No cargo datos sensibles (salud, origen étnico, creencias, afiliación sindical o política, datos biométricos) ni datos de menores de edad en textos o archivos.",
        ] },
      ],
    },
    {
      id: "reporte", titulo: "4. Reporte de incidentes",
      bloques: [
        `Si sospecho que alguien usó mi cuenta, que una información se filtró o que veo algo que no debería ver, lo informo de inmediato a la empresa y a ${P.correo}, y cambio mi contraseña.`,
      ],
    },
    {
      id: "equipo", titulo: "5. Compromisos adicionales del personal de Algoritmo T y de los consultores aliados",
      bloques: [
        { lista: [
          "Accedo a la información de una empresa solo cuando estoy asignado a su proceso o cuando una tarea de soporte, mantenimiento o seguridad lo exige, y solo en la medida necesaria.",
          "No uso la información de una empresa para otra, ni para fines propios, comerciales o académicos, ni en materiales de mercadeo, salvo autorización escrita de la empresa.",
          "Trabajo desde equipos con cifrado de disco, bloqueo de pantalla y sistema operativo actualizado, y activo la verificación en dos pasos cuando esté disponible.",
          "Devuelvo o destruyo la información de la empresa que tenga en mi poder al terminar el proyecto o mi vinculación.",
          "Conozco y cumplo la Política de seguridad de la información y la Política de tratamiento de datos personales.",
        ] },
      ],
    },
    {
      id: "consecuencias", titulo: "6. Incumplimiento",
      bloques: [
        "El incumplimiento de este compromiso puede dar lugar al retiro inmediato del acceso, a las medidas disciplinarias o contractuales que correspondan y a las acciones legales por los perjuicios causados, incluidas las previstas en la Ley 1273 de 2009 (delitos informáticos) y en la Ley 256 de 1996 (competencia desleal).",
      ],
    },
  ],
  firmas: [
    { parte: "La persona", campos: ["Nombre: {{nombre}}", "Correo: {{correo}}", "Rol o vinculación: {{rol}}", "Fecha: {{fecha}}"] },
  ],
};

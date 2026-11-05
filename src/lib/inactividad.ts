// Cierre de sesión por inactividad: minutos sin interacción tras los cuales la cookie caduca y el panel cierra la
// sesión con un aviso. Lo comparten el servidor (duración de la cookie) y el cliente (vigilante del panel).
// NEXT_PUBLIC_INACTIVIDAD_MIN permite acortarlo en desarrollo para probar el flujo.
export const INACTIVIDAD_MIN = Math.max(1, Number(process.env.NEXT_PUBLIC_INACTIVIDAD_MIN) || 30);

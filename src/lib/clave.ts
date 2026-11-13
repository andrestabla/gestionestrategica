// Clave con la que la plataforma firma sesiones, enlaces públicos y resúmenes de códigos (AUTH_SECRET).
// En producción no hay clave de respaldo: si falta, nada se firma ni se acepta, antes que operar con una clave que
// está en el código. La clave de desarrollo solo vale fuera de producción.
const SECRET = process.env.AUTH_SECRET?.trim() || (process.env.NODE_ENV === "production" ? "" : "pgtd-dev-secret-cambiar-en-produccion");

/** ¿Hay clave de firma? Sin ella no se acepta ninguna firma. */
export const hayClave = () => SECRET.length > 0;
/** La clave de firma. Lanza si falta en producción. */
export function authSecret(): string {
  if (!SECRET) throw new Error("AUTH_SECRET no está configurada: la plataforma no firma sesiones ni enlaces sin su clave.");
  return SECRET;
}

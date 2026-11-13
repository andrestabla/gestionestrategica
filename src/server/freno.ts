// Freno a los intentos repetidos sobre las puertas públicas (inicio de sesión, recuperación de contraseña, códigos).
// Cuenta en la memoria de cada instancia del servidor: en un despliegue con varias instancias el tope real es algo
// mayor, así que es una primera barrera, no la única. El bloqueo de una cuenta tras varios fallos sí queda en la base
// (registrarFalloLogin, en el store).

const cubos = new Map<string, number[]>();

/** Dirección del cliente. En Vercel la pone la plataforma (x-real-ip, o el primer valor de x-forwarded-for). */
export function ipDe(req: Request): string {
  const h = req.headers;
  return (h.get("x-real-ip") ?? (h.get("x-forwarded-for") ?? "").split(",")[0]).trim() || "local";
}

/** Anota un intento bajo `clave` y dice si ya se pasó de `max` dentro de la ventana. */
export function frenado(clave: string, max: number, ventanaMs: number): boolean {
  const ahora = Date.now(), previos = (cubos.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (previos.length >= max) { cubos.set(clave, previos); return true; }
  previos.push(ahora); cubos.set(clave, previos);
  if (cubos.size > 20_000) for (const [k, v] of cubos) if (!v.some((t) => ahora - t < 3_600_000)) cubos.delete(k);
  return false;
}

/** Olvida los intentos anotados bajo una clave (tras un inicio de sesión correcto). */
export const liberar = (clave: string) => { cubos.delete(clave); };
/** Solo para pruebas. */
export const reiniciarFrenos = () => { cubos.clear(); };

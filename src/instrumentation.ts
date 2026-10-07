// Se ejecuta al arrancar cada entrada del servidor (Next lo rastrea para todas
// las funciones): asegura que Prisma, los adaptadores y bcrypt viajen al
// despliegue aunque el store los cargue de forma opaca.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/server/db");
  }
}

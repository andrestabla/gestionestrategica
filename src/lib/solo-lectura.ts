// Cuenta de solo lectura (demostración): recorre toda la plataforma con el rol que se le asignó, pero ninguna escritura
// se atiende. La regla es pura para que la apliquen igual el servidor (src/app/api/td/_helpers.ts, que la exige con la
// cuenta tal como está en la base) y el navegador (src/components/tour-guia.tsx, que evita la ida y vuelta).

export const SOLO_LECTURA = "Esta es una cuenta de demostración de solo lectura: puedes recorrer toda la plataforma, pero los cambios no se guardan.";

/** Lo único que una cuenta de solo lectura puede escribir: el estado de lectura de sus propios avisos y la aceptación
    del tratamiento de datos del primer ingreso (sin ella no podría entrar). Ninguna de las dos toca el caso demo. */
const PERMITIDAS = /^(?:https?:\/\/[^/]+)?\/(?:[a-z0-9-]+\/)?api\/td\/(?:notifications|perfil\/consentimiento)(?:\?.*)?$/i;

/** ¿Se bloquea esta petición de una cuenta de solo lectura? Solo las escrituras a la API de la plataforma. */
export function bloqueaSoloLectura(metodo: string, url: string): boolean {
  const m = metodo.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return false;
  if (!/\/api\/td\//.test(url)) return false;
  return !PERMITIDAS.test(url);
}

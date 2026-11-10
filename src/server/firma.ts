// Huella de un objetivo directivo tal como se aprobó: prioridad, enunciado, aspiración e indicador impulsor.
// Si cualquiera cambia, la aprobación del comité deja de valer y el objetivo vuelve a la lectura del modelo.

import { createHash } from "node:crypto";

export const firmaObjetivo = (o: { lever?: string; name: string; desc?: string; indicator?: string }): string =>
  createHash("sha256").update(JSON.stringify([o.lever ?? "", o.name, o.desc ?? "", o.indicator ?? ""])).digest("hex").slice(0, 16);

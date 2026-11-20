// Índice de los documentos legales de la plataforma (ver ./base.ts).

import type { DocId, DocLegal } from "./base";
import { POLITICA_TRATAMIENTO } from "./tratamiento";
import { POLITICA_SEGURIDAD } from "./seguridad";
import { ACUERDO_CONFIDENCIALIDAD } from "./confidencialidad";
import { CONTRATO_TRANSMISION } from "./transmision";
import { COMPROMISO_CONFIDENCIALIDAD } from "./compromiso";

export * from "./base";
export * from "./acuerdos";

export const DOCUMENTOS_LEGALES: DocLegal[] = [POLITICA_TRATAMIENTO, POLITICA_SEGURIDAD, COMPROMISO_CONFIDENCIALIDAD, ACUERDO_CONFIDENCIALIDAD, CONTRATO_TRANSMISION];
export const docLegal = (id: string): DocLegal | null => DOCUMENTOS_LEGALES.find((d) => d.id === id) ?? null;
export const esDocId = (id: string): id is DocId => DOCUMENTOS_LEGALES.some((d) => d.id === id);

/** Dirección pública de cada documento. */
export const rutaDoc = (id: DocId): string => (id === "tratamiento" ? "/privacidad" : id === "seguridad" ? "/seguridad" : `/legal/${id}`);

/** Versión del conjunto que cada persona acepta al entrar: la más reciente entre la política de tratamiento y el compromiso. */
export const VERSION_ACEPTACION = [POLITICA_TRATAMIENTO.version, COMPROMISO_CONFIDENCIALIDAD.version].sort().at(-1)!;

export { POLITICA_TRATAMIENTO, POLITICA_SEGURIDAD, ACUERDO_CONFIDENCIALIDAD, CONTRATO_TRANSMISION, COMPROMISO_CONFIDENCIALIDAD };

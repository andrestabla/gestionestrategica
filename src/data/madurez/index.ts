// Instrumentos de madurez digital por tipo de organización.
import type { MadInstrument, OrgKind } from "@/lib/madurez";
import { EMPRESA } from "./empresa";
import { EDUCATIVA } from "./educativa";

export const INSTRUMENTS: Record<OrgKind, MadInstrument> = { empresa: EMPRESA, educativa: EDUCATIVA };
export const instrumentOf = (kind: OrgKind | undefined | null): MadInstrument => INSTRUMENTS[kind === "educativa" ? "educativa" : "empresa"];

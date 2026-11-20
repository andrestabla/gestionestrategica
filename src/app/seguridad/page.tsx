import type { Metadata } from "next";
import { POLITICA_SEGURIDAD } from "@/lib/legal";
import { VistaLegal } from "../legal/vista-legal";

export const metadata: Metadata = { title: "Política de seguridad de la información · Gestión estratégica", description: POLITICA_SEGURIDAD.resumen };
export default function SeguridadPage() { return <VistaLegal doc={POLITICA_SEGURIDAD} />; }

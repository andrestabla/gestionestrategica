import type { Metadata } from "next";
import { POLITICA_TRATAMIENTO } from "@/lib/legal";
import { VistaLegal } from "../legal/vista-legal";

export const metadata: Metadata = { title: "Política de tratamiento de datos personales · Gestión estratégica", description: POLITICA_TRATAMIENTO.resumen };
export default function PrivacidadPage() { return <VistaLegal doc={POLITICA_TRATAMIENTO} />; }

import type { Metadata } from "next";
import { IndiceLegal } from "./vista-legal";

export const metadata: Metadata = { title: "Centro de confianza · Gestión estratégica", description: "Políticas de tratamiento de datos y de seguridad de la información, y los acuerdos de confidencialidad de la plataforma." };
export default function LegalPage() { return <IndiceLegal />; }

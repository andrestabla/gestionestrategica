import type { Metadata } from "next";
import { SolicitarClient } from "./solicitar-client";
import type { AlcanceCodigo } from "@/lib/codigos";

export const metadata: Metadata = { title: "Solicitar un código · Gestión estratégica", description: "Pide tu código de acceso al diagnóstico de madurez en transformación digital o al test de capacidades." };

// /solicitar-codigo — formulario público para pedir un código de acceso a los diagnósticos.
// ?d=madurez-digital | test-de-capacidades deja marcado el diagnóstico desde cuya página se llegó.
export default async function SolicitarCodigoPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const d = (await searchParams).d;
  const inicial: AlcanceCodigo[] = d === "madurez-digital" ? ["madurez"] : d === "test-de-capacidades" ? ["test"] : ["madurez", "test"];
  return <SolicitarClient inicial={inicial} volver={d === "madurez-digital" || d === "test-de-capacidades" ? `/diagnosticos/${d}` : "/#diagnosticos"} />;
}

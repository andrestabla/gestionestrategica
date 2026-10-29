"use client";

// Rutas semánticas de estrategia (acompañamiento): /panel/estrategia/prioridades · objetivos · resultados-clave ·
// iniciativas · priorizacion · portafolio. Misma página que la convención, con la sección tomada de la ruta.
import { useParams } from "next/navigation";
import { EstrategiaPage } from "@/app/panel/convencion/estrategia";
import { estrategiaTabOfSlug } from "@/lib/vocabulario";
import { Card, EmptyNote } from "@/components/ui";

export default function EstrategiaSeccionPage() {
  const { seccion } = useParams<{ seccion: string }>();
  const tab = estrategiaTabOfSlug(seccion);
  if (!tab) return <Card className="rise p-6"><EmptyNote>Esta sección de estrategia no existe. Las secciones son prioridades, objetivos, resultados-clave, iniciativas, priorizacion y portafolio.</EmptyNote></Card>;
  return <EstrategiaPage seccion={tab} />;
}

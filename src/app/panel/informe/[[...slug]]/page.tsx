"use client";

// Módulo de informes: la pieza imprimible para la junta y el comité.
//   /panel/informe/ejecutivo — compositor de secciones y PDF desde el navegador.

import { PageHeader } from "@/components/ui";
import EjecutivoTab from "./ejecutivo";
import { PortadaDocumento, useDocumento } from "@/components/documento";
import { useCatalog } from "@/components/catalog-context";

export default function InformeModule() {
  const documento = useDocumento(), v = useCatalog();
  if (documento) return (
    <>
      <PortadaDocumento kicker="Informe para la junta y el comité" titulo="Estado de la capacidad organizacional" empresa={v.catalog.company.name} subtitulo="Madurez, brechas, indicadores, iniciativas, presupuesto y planes de trabajo" />
      <div className="doc-flujo"><EjecutivoTab /></div>
    </>
  );
  return (
    <>
      <div className="no-print">
        <PageHeader kicker="Informe" title="Estado de la capacidad organizacional"
          desc="El informe para la junta y el comité: compositor de secciones, tablas ordenables y PDF desde el navegador." />
      </div>
      <EjecutivoTab />
    </>
  );
}

"use client";

// Módulo de informes: la pieza imprimible para la junta y el comité.
//   /panel/informe/ejecutivo — compositor de secciones y PDF desde el navegador.

import { PageHeader } from "@/components/ui";
import EjecutivoTab from "./ejecutivo";

export default function InformeModule() {
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

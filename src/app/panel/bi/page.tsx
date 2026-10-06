"use client";

// M7 · Inteligencia: el contexto del sector y del territorio de la empresa.
// Enlaza con los observatorios de Algoritmo T y deja declarado qué fuente
// alimenta cada lectura. Se configura por sector en Administración.

import { PageHeader, Card } from "@/components/ui";
import { AccessChip } from "@/components/user-context";
import { INSTITUTION } from "@/data/demo";
import { ExternalLink, Briefcase, Map as MapIcon, TrendingUp, FileOutput, Factory } from "lucide-react";

const SOURCES = [
  {
    icon: Factory, title: "Sector y competencia",
    desc: "Tamaño del mercado de suministros industriales, crecimiento, concentración y márgenes de referencia de distribuidores comparables.",
    tags: ["Supersociedades", "DANE · EAC", "Cámaras de comercio"],
    href: "https://www.algoritmot.com/bi/regional",
  },
  {
    icon: MapIcon, title: "Territorio y demanda",
    desc: "Actividad industrial y de construcción por departamento: dónde está la demanda que la empresa aún no atiende y qué sede la cubre mejor.",
    tags: ["33 departamentos", "Licencias de construcción", "Parques industriales"],
    href: "https://www.algoritmot.com/bi/regional",
  },
  {
    icon: Briefcase, title: "Talento y empleabilidad",
    desc: "Oferta de perfiles comerciales, logísticos y administrativos en las ciudades donde opera y donde planea abrir.",
    tags: ["OLE", "DANE · GEIH"],
    href: "https://www.algoritmot.com/bi/laboral",
  },
  {
    icon: TrendingUp, title: "Señales de crecimiento",
    desc: "Importaciones de insumos industriales, precios de referencia y ciclos de compra de los sectores cliente.",
    tags: ["DIAN", "Banco de la República"],
    href: "https://www.algoritmot.com/bi/oferta",
  },
  {
    icon: FileOutput, title: "Espacio de trabajo",
    desc: "Informes propios combinando sector, territorio y los resultados del diagnóstico, exportables en PDF y CSV.",
    tags: ["Autonomía"],
    href: "https://www.algoritmot.com/bi/workspace",
  },
];

export default function BiPage() {
  return (
    <>
      <PageHeader kicker="M7 · Inteligencia" title={`Inteligencia del sector · ${INSTITUTION.sector}`}
        desc="El contexto que el diagnóstico no mide: cómo se mueve el sector, dónde está la demanda y qué talento hay disponible. Llega con datos desde el primer día, sin que la empresa tenga que aportarlos." actions={<AccessChip module="bi" />} />

      <div className="grid gap-4 sm:grid-cols-2">
        {SOURCES.map((o, i) => (
          <Card key={o.title} hover className={`rise rise-${Math.min(i + 1, 4)} p-6`}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--cyan) 0%, var(--navy) 100%)" }}>
              <o.icon size={20} className="text-white" />
            </div>
            <h3 className="mt-3.5 text-[16px] font-bold tracking-tight text-ink">{o.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{o.desc}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {o.tags.map((t) => <span key={t} className="chip">{t}</span>)}
            </div>
            <a href={o.href} target="_blank" rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-cyan-deep hover:underline">
              Abrir observatorio <ExternalLink size={13} />
            </a>
          </Card>
        ))}
      </div>

      <p className="rise rise-4 mt-5 rounded-xl border border-dashed border-line-strong bg-surface px-5 py-4 text-[12.5px] leading-relaxed text-muted">
        Las fuentes se configuran por sector en Administración. En el despliegue de producción este módulo
        enlaza con el BI de Algoritmo T mediante inicio de sesión unificado, de modo que el equipo de la
        empresa navega los observatorios y genera informes sin una segunda credencial.
      </p>
    </>
  );
}

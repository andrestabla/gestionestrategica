"use client";

// Portada de un espacio que solo tiene los diagnósticos de entrada (los que nacen con un código de acceso):
// en lugar de los tableros de estrategia, que estarían vacíos, muestra los diagnósticos que la persona puede
// responder y a dónde ir. Si la empresa tiene más módulos encendidos, se usa la portada normal.

import Link from "next/link";
import { ArrowRight, ClipboardList, Cpu } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { ALL_MODULES, moduleEnabled, type ModuleId } from "@/lib/modulos";
import { hasInstrument } from "@/lib/instrumentos";
import type { CompanyInfo } from "@/data/catalogo";

const DE_ENTRADA: ModuleId[] = ["diagnostico", "madurez"];
/** ¿El espacio solo tiene encendidos los diagnósticos de entrada? */
export const soloDiagnosticos = (c: CompanyInfo) => { const on = ALL_MODULES.filter((m) => moduleEnabled(c, m)); return on.length > 0 && on.every((m) => DE_ENTRADA.includes(m)); };

export function DiagnosticosHome({ company, base, nombre }: { company: CompanyInfo; base: string; nombre: string }) {
  const items = [
    ...(moduleEnabled(company, "madurez") ? [{ icon: Cpu, t: "Diagnóstico de madurez en transformación digital", d: "Cuarenta y ocho afirmaciones sobre las prácticas digitales de la organización. Tus respuestas se guardan a medida que avanzas y, al terminar, recibes tu lectura personal.", href: `${base}/panel/madurez/percepcion`, cta: "Responder el diagnóstico" }] : []),
    ...(moduleEnabled(company, "diagnostico") && hasInstrument(company, "test") ? [{ icon: ClipboardList, t: "Test de capacidades", d: "Veinticinco preguntas sobre cómo funciona hoy la empresa. Se guarda al enviarlo y entrega un informe de una página.", href: `${base}/panel/diagnostico/test`, cta: "Ir al test" }] : []),
  ];
  return (
    <>
      <PageHeader kicker={company.name} title={`Hola, ${nombre.split(" ")[0]}`}
        desc={items.length > 1 ? "Estos son los diagnósticos de tu organización. Puedes responderlos en el orden que prefieras." : "Este es el diagnóstico de tu organización."} />
      <div className={`grid gap-5 ${items.length > 1 ? "md:grid-cols-2" : "max-w-[640px]"}`}>
        {items.map((x, i) => (
          <article key={x.t} className={`panel rise rise-${i + 1} flex flex-col p-6`}>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--gold-wash)] text-[var(--gold)]"><x.icon size={21} /></span>
            <h2 className="mt-4 text-[18px] font-extrabold leading-tight tracking-[-0.015em] text-ink">{x.t}</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{x.d}</p>
            <Link href={x.href} className="btn-primary mt-5 self-start">{x.cta} <ArrowRight size={15} /></Link>
          </article>
        ))}
      </div>
      <p className="mt-6 max-w-[80ch] text-[12.5px] leading-relaxed text-muted">El equipo que te envió el código acompaña el diagnóstico: revisa la evidencia contigo y prepara el informe de resultados. Si más personas de tu organización van a participar, ese equipo las agrega a este espacio.</p>
    </>
  );
}

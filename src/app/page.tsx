import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SitioPublico } from "./sitio-publico";

export const metadata: Metadata = {
  title: "Gestión estratégica · De la estrategia declarada a la estrategia cumplida",
  description:
    "Plataforma para comités directivos: diagnóstico de capacidades, prioridades, objetivos y resultados clave, matriz de priorización de iniciativas, portafolio y cascada trimestral.",
  openGraph: {
    title: "Gestión estratégica",
    description: "Del diagnóstico de capacidades a la cascada trimestral: la estrategia se decide con una misma regla y queda a la vista de todos.",
    locale: "es_CO",
    type: "website",
  },
};

// La raíz decide: con sesión → panel de la empresa; sin sesión → sitio público.
export default async function Home() {
  const user = await getSession();
  if (user) redirect(user.company ? `/${user.company.slug}/panel` : user.role === "ADMIN" ? "/empresas" : "/panel");
  return <SitioPublico />;
}

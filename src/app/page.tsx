import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SitioPublico } from "./sitio-publico";

export const metadata: Metadata = {
  title: "Gestión estratégica · De la estrategia declarada a la estrategia cumplida",
  description:
    "Plataforma para comités directivos: diagnóstico de capacidades, definición de prioridades, objetivos y resultados clave, priorización de iniciativas y seguimiento trimestral.",
  openGraph: {
    title: "Gestión estratégica",
    description: "Del diagnóstico de capacidades al seguimiento trimestral: cada decisión conserva sus criterios, responsables y evidencias.",
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

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SitioPublico } from "./sitio-publico";

export const metadata: Metadata = {
  title: "Gestión estratégica · De la estrategia declarada a la estrategia cumplida",
  description:
    "Consultores expertos en análisis y toma de decisiones acompañan al comité directivo, con una plataforma para el diagnóstico, las prioridades, los resultados clave, la priorización de iniciativas y el seguimiento trimestral.",
  openGraph: {
    title: "Gestión estratégica",
    description: "Acompañamiento de consultores expertos y una plataforma: del diagnóstico al seguimiento trimestral, cada decisión conserva sus criterios, responsables y evidencias.",
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

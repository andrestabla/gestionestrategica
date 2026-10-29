// Encuesta anónima de la Fuente 2 (percepción de equipos). Sin sesión: el
// enlace firmado de la empresa da el acceso. Server component que valida el
// token y entrega el formulario cliente.

import { notFound } from "next/navigation";
import { verifySurveyToken, splitSignedLink } from "@/lib/public-token";
import { hydrateCompanies, companyBySlug } from "@/server/store";
import { SurveyForm } from "./form";
import { hasInstrument } from "@/lib/instrumentos";

export const dynamic = "force-dynamic";

export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = splitSignedLink(token);
  if (!link) notFound();
  const { slug, token: firma } = link;
  await hydrateCompanies();
  const company = companyBySlug(slug);
  if (!company?.active || !verifySurveyToken(slug, firma) || !hasInstrument(company, "f2")) notFound();
  return <SurveyForm token={token} company={company.name} />;
}

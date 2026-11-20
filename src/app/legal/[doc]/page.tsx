import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { DOCUMENTOS_LEGALES, docLegal, rutaDoc } from "@/lib/legal";
import { VistaLegal } from "../vista-legal";

// /legal/<id>: los modelos de acuerdo y el compromiso. Las dos políticas viven en /privacidad y /seguridad.
export function generateStaticParams() { return DOCUMENTOS_LEGALES.map((d) => ({ doc: d.id })); }
export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const d = docLegal((await params).doc);
  return d ? { title: `${d.corto} · Gestión estratégica`, description: d.resumen } : {};
}
export default async function DocLegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const d = docLegal((await params).doc);
  if (!d) notFound();
  if (rutaDoc(d.id) !== `/legal/${d.id}`) permanentRedirect(rutaDoc(d.id));
  return <VistaLegal doc={d} />;
}

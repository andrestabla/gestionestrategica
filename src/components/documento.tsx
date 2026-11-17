"use client";

// Informes como documento: el botón «Descargar PDF» pide al servidor el PDF del informe (src/app/api/td/pdf) y lo
// descarga como archivo, sin el cuadro de impresión del navegador. El servidor abre la misma página en modo documento
// (?documento=1): sin menú ni barra, con portada editorial y estilos de página; `useDocumento` dice si se está en él.

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { avisar } from "@/components/feedback";

export const useDocumento = (): boolean => useSearchParams().get("documento") === "1";

/** Botón que descarga el informe en PDF. `ruta`: la página del informe en el panel (con su consulta), sin el prefijo de la empresa. */
export function DescargarPdf({ ruta, endpoint, titulo, hojas, className, etiqueta = "Descargar PDF" }: { ruta?: string; endpoint?: string; titulo: string; hojas?: boolean; className?: string; etiqueta?: string }) {
  const [busy, setBusy] = useState(false);
  const descargar = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const q = new URLSearchParams({ ruta: ruta ?? "", titulo, ...(hojas ? { hojas: "1" } : {}) });
      const r = await fetch(endpoint ?? `/api/td/pdf?${q}`, { cache: "no-store" });
      if (!r.ok) { const j = await r.json().catch(() => ({})); avisar(j.error ?? `No se pudo generar el PDF (error ${r.status}).`, "warn"); return; }
      const blob = await r.blob();
      const nombre = decodeURIComponent((r.headers.get("content-disposition") ?? "").match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? `${titulo}.pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch { avisar("No se pudo conectar con el servidor para generar el PDF.", "warn"); }
    finally { setBusy(false); }
  };
  return (
    <button type="button" onClick={() => void descargar()} disabled={busy} className={`${className ?? "btn-primary btn-sm"} inline-flex items-center gap-1.5 disabled:opacity-60`} title="Descarga el informe en PDF con diseño editorial">
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} {busy ? "Preparando el PDF…" : etiqueta}
    </button>
  );
}

/** Portada editorial del documento (solo en modo documento): página completa, sin encabezado ni pie. */
export function PortadaDocumento({ kicker, titulo, empresa, subtitulo, fecha, tesis, notas }: { kicker: string; titulo: string; empresa: string; subtitulo?: string; fecha?: string; tesis?: string; notas?: string[] }) {
  return (
    <section className="doc-portada">
      <div className="doc-portada-marca">
        <span className="doc-portada-logo" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 18h4v-4h4v-4h4V6h4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <span>Gestión estratégica<small>4Shine Empresas · Algoritmo T</small></span>
      </div>
      <div className="doc-portada-cuerpo">
        <div className="doc-portada-kicker">{kicker}</div>
        <h1 className="doc-portada-titulo">{titulo}</h1>
        <div className="doc-portada-empresa">{empresa}</div>
        {subtitulo && <div className="doc-portada-sub">{subtitulo}</div>}
        {tesis && <p className="doc-portada-tesis">{tesis}</p>}
      </div>
      <div className="doc-portada-pie">
        <span>{fecha ?? new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</span>
        <span>{(notas ?? ["Documento confidencial · uso exclusivo de la empresa"]).join(" · ")}</span>
      </div>
    </section>
  );
}

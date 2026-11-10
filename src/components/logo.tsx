// Isotipo de Gestión estratégica (plataforma de Algoritmo T): trayectoria dorada sobre marino.

/* eslint-disable @next/next/no-img-element */
export function AlgoritmoMark({ size = 22 }: { size?: number }) {
  return (
    <img src="/ge-isotipo.png" alt="Gestión estratégica" width={size} height={size}
      style={{ width: size, height: size, objectFit: "contain", display: "block" }} />
  );
}

/** Marca de la plataforma compuesta: isotipo + «Gestión estratégica» + firma. Se compone con texto porque los
    PNG del logotipo llevan grabado otro subtítulo; la firma vigente se cambia aquí. */
export const FIRMA_MARCA = "4Shine Empresas";
/** Crédito del producto: va al pie del sitio público y del acceso. */
export const DESARROLLADO_POR = "Producto desarrollado por Algoritmo T · 4Shine Empresas";
export function MarcaGE({ oscura, alto = "28px", className = "", firma = true }: { oscura: boolean; alto?: string; className?: string; /** El sitio público no lleva firma: solo el nombre de la plataforma. */ firma?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} style={{ height: alto }}>
      <img src="/ge-isotipo.png" alt="" className="h-full w-auto object-contain" />
      <span className="leading-none normal-case tracking-normal">
        <span className={`block font-extrabold ${oscura ? "text-white" : "text-ink"}`} style={{ fontSize: `calc(${alto} * ${firma ? 0.42 : 0.5})` }}>Gestión estratégica</span>
        {firma && <span className={`block font-semibold uppercase ${oscura ? "text-white/55" : "text-faint"}`} style={{ fontSize: `calc(${alto} * 0.24)`, letterSpacing: "0.16em", marginTop: `calc(${alto} * 0.06)` }}>{FIRMA_MARCA}</span>}
      </span>
    </span>
  );
}

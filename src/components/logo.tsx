// Isotipo de Gestión estratégica (plataforma de Algoritmo T): trayectoria dorada sobre marino.

/* eslint-disable @next/next/no-img-element */
export function AlgoritmoMark({ size = 22 }: { size?: number }) {
  return (
    <img src="/ge-isotipo.png" alt="Gestión estratégica" width={size} height={size}
      style={{ width: size, height: size, objectFit: "contain", display: "block" }} />
  );
}

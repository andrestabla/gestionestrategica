// Marca 4Shine (isotipo PNG del manual de marca).

/* eslint-disable @next/next/no-img-element */
export function AlgoritmoMark({ size = 22 }: { size?: number }) {
  return (
    <img src="/4shine-isotipo.png" alt="4Shine" width={size} height={size}
      style={{ width: size, height: size, objectFit: "contain", display: "block" }} />
  );
}

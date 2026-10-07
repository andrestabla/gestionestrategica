"use client";

// La vista de la empresa activa, disponible en toda la UI del panel. El
// layout (servidor) la entrega ya resuelta para la empresa de la sesión; las
// páginas la leen con useCatalog() y la refrescan tras mutar.

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { TenantView } from "@/lib/vista";

type Ctx = { view: TenantView; refetch: () => Promise<void> };
const CatalogCtx = createContext<Ctx | null>(null);

export function CatalogProvider({ initial, children }: { initial: TenantView; children: ReactNode }) {
  const [view, setView] = useState<TenantView>(initial);
  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/td/catalogo");
      if (res.ok) setView(await res.json());
    } catch { /* se conserva la vista actual */ }
  }, []);
  return <CatalogCtx.Provider value={{ view, refetch }}>{children}</CatalogCtx.Provider>;
}

/** Vista de la empresa activa (catálogo + efectivo). */
export function useCatalog(): TenantView {
  const c = useContext(CatalogCtx);
  if (!c) throw new Error("useCatalog fuera de CatalogProvider");
  return c.view;
}

export function useCatalogRefetch(): () => Promise<void> {
  const c = useContext(CatalogCtx);
  if (!c) throw new Error("useCatalogRefetch fuera de CatalogProvider");
  return c.refetch;
}

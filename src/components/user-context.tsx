"use client";

// Contexto de usuario para que las páginas reflejen la matriz de permisos.
// La UI solo REFLEJA: la exigencia real ocurre en el servidor (403/422).

import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/lib/session";
import { describeAccess, can, type ModuleKey, type Action } from "@/lib/permissions";

const Ctx = createContext<SessionUser | null>(null);

export function UserProvider({ user, children }: { user: SessionUser; children: ReactNode }) {
  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}

export function useUser(): SessionUser {
  const u = useContext(Ctx);
  if (!u) throw new Error("useUser fuera de UserProvider");
  return u;
}

export function useCan(action: Action, line?: number): boolean {
  return can(useContext(Ctx), action, line);
}

/** Chip de acceso del módulo: qué puede hacer el rol del usuario aquí. */
export function AccessChip({ module }: { module: ModuleKey }) {
  const user = useContext(Ctx);
  const acc = describeAccess(user, module);
  const cls = acc.level === "full" ? "chip chip-ok"
    : acc.level === "line" || acc.level === "partial" ? "chip chip-cyan"
    : "chip";
  return (
    <span className={cls}
      title={`Permisos de tu rol (${user?.role}) en este módulo. La matriz completa se aplica también en el servidor.`}>
      {acc.label}
    </span>
  );
}

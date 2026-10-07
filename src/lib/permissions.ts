// ─────────────────────────────────────────────────────────────────────────────
// PGTD · Matriz central de permisos (RBAC).
// Única fuente de verdad de quién puede qué, por módulo y por acción.
// Se aplica en dos capas: el servidor la EXIGE en cada mutación (403) y la
// UI la REFLEJA (controles ocultos o deshabilitados + chip de acceso).
//
// Roles:
//  ADMIN       — administrador de la plataforma: usuarios, permisos,
//                integraciones y branding. No opera la medición.
//  CONSULTOR   — advisor 4Shine: configura el diagnóstico, verifica
//                evidencia y publica mediciones. Edición completa.
//  LIDER       — líder de la empresa: administra iniciativas, tareas y KPI
//                de todas las capacidades. No configura el diagnóstico.
//  RESPONSABLE — responsable de capacidad: edita lo de SU capacidad (tareas
//                de sus iniciativas, avance, evidencia propia) y reporta KPI suyos.
//  DIRECTIVO   — junta o directivo: lectura de todo, edición de nada.
// ─────────────────────────────────────────────────────────────────────────────

import type { SessionUser } from "@/lib/session";

export type ModuleKey =
  | "panel" | "madurez" | "benchmark" | "capacidades"
  | "kpi" | "ruta" | "iniciativas" | "proyectos" | "bi" | "metodologia" | "admin";

export type Action =
  | "view"              // ver el módulo
  | "edit_tasks"        // crear/editar/mover tareas del gestor
  | "edit_initiatives"  // avance, factores, bitácora de iniciativas
  | "evaluate_initiatives" // calificar con la matriz 4Shine de priorización (D·E·M·L y tipo)
  | "decide_initiatives"   // decidir el tiempo: implementar, preparar, backlog o renunciar
  | "report_kpi"        // registrar valores de KPI
  | "capture_maturity"  // capturar celdas de una medición en curso
  | "publish_maturity"  // publicar mediciones / configurar el instrumento
  | "verify_evidence"   // marcar evidencia como VERIFICADA
  | "manage_users"      // administrar usuarios y roles
  | "manage_platform";  // integraciones, branding y configuración de la plataforma

export type Role = SessionUser["role"];

// nivel de acceso: false = no · true = total · "line" = solo su línea
type Grant = boolean | "line";

const MATRIX: Record<Action, Record<Role, Grant>> = {
  view:             { ADMIN: true,  CONSULTOR: true, LIDER: true, RESPONSABLE: true, DIRECTIVO: true },
  edit_tasks:       { ADMIN: false, CONSULTOR: true, LIDER: true, RESPONSABLE: "line", DIRECTIVO: false },
  edit_initiatives: { ADMIN: false, CONSULTOR: true, LIDER: true, RESPONSABLE: "line", DIRECTIVO: false },
  // la convención de prioridades: advisor, gerencia y junta evalúan todo el
  // portafolio; el responsable de capacidad evalúa las iniciativas de la suya.
  evaluate_initiatives: { ADMIN: false, CONSULTOR: true, LIDER: true, RESPONSABLE: "line", DIRECTIVO: true },
  // la decisión de tiempo la toma la gerencia con el advisor
  decide_initiatives:   { ADMIN: false, CONSULTOR: true, LIDER: true, RESPONSABLE: false, DIRECTIVO: false },
  report_kpi:       { ADMIN: false, CONSULTOR: true, LIDER: true, RESPONSABLE: "line", DIRECTIVO: false },
  capture_maturity: { ADMIN: false, CONSULTOR: true, LIDER: false, RESPONSABLE: "line", DIRECTIVO: false },
  publish_maturity: { ADMIN: false, CONSULTOR: true, LIDER: false, RESPONSABLE: false, DIRECTIVO: false },
  verify_evidence:  { ADMIN: false, CONSULTOR: true, LIDER: false, RESPONSABLE: false, DIRECTIVO: false },
  manage_users:     { ADMIN: true,  CONSULTOR: true, LIDER: false, RESPONSABLE: false, DIRECTIVO: false },
  manage_platform:  { ADMIN: true,  CONSULTOR: false, LIDER: false, RESPONSABLE: false, DIRECTIVO: false },
};

/** ¿Puede el usuario ejecutar la acción? `line` restringe al ámbito de su línea. */
export function can(user: SessionUser | null, action: Action, line?: number): boolean {
  if (!user) return false;
  const grant = MATRIX[action][user.role];
  if (grant === true) return true;
  if (grant === "line") {
    if (line === undefined) return true;        // capacidad general (la UI muestra el control)
    return user.line === line;                   // recurso concreto: debe ser su línea
  }
  return false;
}

/** Acciones relevantes por módulo (para el chip de acceso y la documentación). */
export const MODULE_ACTIONS: Record<ModuleKey, Action[]> = {
  panel:        ["view"],
  madurez:      ["view", "capture_maturity", "publish_maturity", "verify_evidence"],
  benchmark:    ["view"],
  capacidades:  ["view", "edit_initiatives"],
  kpi:          ["view", "report_kpi"],
  ruta:         ["view", "edit_initiatives"],
  iniciativas:  ["view", "edit_initiatives", "edit_tasks", "evaluate_initiatives", "decide_initiatives"],
  proyectos:    ["view", "edit_tasks", "verify_evidence"],
  bi:           ["view"],
  metodologia:  ["view"],
  admin:        ["view", "manage_users", "manage_platform"],
};

/** Descripción del acceso del usuario a un módulo, para mostrar en la UI. */
export function describeAccess(user: SessionUser | null, module: ModuleKey): {
  level: "none" | "read" | "line" | "partial" | "full";
  label: string;
} {
  if (!user) return { level: "none", label: "Sin acceso" };
  const actions = MODULE_ACTIONS[module].filter((a) => a !== "view");
  if (actions.length === 0) {
    return { level: "read", label: "Lectura" };
  }
  const grants = actions.map((a) => MATRIX[a][user.role]);
  if (grants.every((g) => g === false)) return { level: "read", label: "Lectura" };
  if (grants.every((g) => g === true)) return { level: "full", label: "Edición completa" };
  if (grants.some((g) => g === true) && grants.every((g) => g !== "line")) {
    // algunas acciones sí, otras no (p. ej. la junta evalúa pero no edita)
    const yes = actions.filter((a) => MATRIX[a][user.role] === true);
    if (yes.every((a) => a === "evaluate_initiatives")) return { level: "partial", label: "Evalúa la priorización" };
    return { level: "full", label: "Edición completa" };
  }
  if (grants.some((g) => g === true)) return { level: "full", label: "Edición completa" };
  const lineName = user.line ? `la capacidad ${["", "Dirección", "Liderazgo", "Ejecución", "Multiplicación"][user.line]}` : "tu capacidad";
  return { level: "line", label: `Edición de ${lineName}` };
}

/** Resumen de la matriz para documentación/pruebas. */
export const PERMISSION_MATRIX = MATRIX;

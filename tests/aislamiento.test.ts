// Garantía multiempresa: ningún módulo de la interfaz ni de la lógica importa
// las constantes de la empresa demo. Los datos de empresa llegan por la vista
// (lib/vista) desde el store de la empresa activa o el CatalogProvider.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN: Record<string, string[]> = {
  "@/data/demo": ["INSTITUTION", "COMPANY", "SCORES", "PREV_SCORES", "lineScore", "lineTarget", "institutionScore", "EVIDENCES", "OBJECTIVES", "CAPABILITIES", "KPIS", "INITIATIVES", "TERRITORIES", "FINANCIALS", "DEMO_USERS", "KpiDemo", "InitiativeDemo"],
  "@/data/cmi": ["RESPONSIBLES", "responsible", "CMI_OBJECTIVES", "KPI_CATALOG", "EVIDENCE_CATALOG", "evidenceOfPractice", "INITIATIVES_FULL", "CONSOLIDATED", "SCORES_HISTORY", "ASSESSMENTS", "currentAssessment", "previousAssessment"],
  "@/data/proyectos": ["PEOPLE", "person", "TASKS", "tasksOf"],
  "@/data/od-demo": ["*"],
  "@/data/priorizacion-demo": ["*"],
};
const ALLOWED_FILES = new Set(["src/data/catalogo.ts", "src/data/demo.ts", "src/data/cmi.ts", "src/data/proyectos.ts", "src/data/od-demo.ts", "src/data/priorizacion-demo.ts", "src/server/store.ts", "src/server/catalog-db.ts"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(n)) out.push(p);
  }
  return out;
}

test("la interfaz y la lógica no dependen de la empresa demo", () => {
  const files = ["src/app", "src/components", "src/lib", "src/server"].flatMap((d) => walk(d));
  const offenses: string[] = [];
  for (const f of files) {
    if (ALLOWED_FILES.has(f)) continue;
    const src = readFileSync(f, "utf8");
    for (const [mod, names] of Object.entries(FORBIDDEN)) {
      const re = new RegExp(`import\\s*(type\\s*)?\\{([^}]*)\\}\\s*from\\s*"${mod.replace("/", "\\/")}"`, "g");
      for (const m of src.matchAll(re)) {
        if (m[1]) continue;   // import type: solo tipos
        const imported = m[2].split(",").map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]).filter(Boolean);
        const bad = names.includes("*") ? imported : imported.filter((n) => names.includes(n));
        if (bad.length) offenses.push(`${f}: ${bad.join(", ")} desde ${mod}`);
      }
    }
  }
  assert.deepEqual(offenses, [], "importaciones de la empresa demo fuera del catálogo:\n" + offenses.join("\n"));
});

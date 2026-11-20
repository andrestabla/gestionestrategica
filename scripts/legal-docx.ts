// Genera los Word de los documentos legales (src/lib/legal) en docs/legal/ para revisión del abogado y firma.
// Uso: npx tsx scripts/legal-docx.ts [carpeta]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DOCUMENTOS_LEGALES } from "@/lib/legal";
import { docLegalDocx, nombreDocx } from "@/server/legal-docx";

async function main() {
  const dir = process.argv[2] ?? "docs/legal";
  mkdirSync(dir, { recursive: true });
  for (const d of DOCUMENTOS_LEGALES) {
    const f = join(dir, nombreDocx(d));
    writeFileSync(f, await docLegalDocx(d));
    console.log("ok", f);
  }
}
void main();

// Sube los materiales de la convención (PDF) al almacenamiento de la plataforma
// a través del API, con la sesión del administrador, y los vincula a los momentos
// del itinerario. La contraseña se lee de la variable CONTRASENA (nunca por argumento):
//   read -rs "p?Contraseña del admin: "; echo; CONTRASENA="$p" npx tsx scripts/subir-materiales.ts --slug cresio --origen https://gestionestrategica.io
// --solo-vincular: no sube archivos, solo aplica los vínculos.
// --retirar: retira primero los materiales que ya no existen (plantillas 01 a 08 y el formato F5).
// --ids a,b,c: sube solo esos materiales (por id) y luego aplica los vínculos.
import { readFileSync, existsSync } from "fs";
import { basename } from "path";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const slug = arg("--slug") ?? "cresio", origen = (arg("--origen") ?? "http://localhost:3000").replace(/\/$/, "");
const email = arg("--email") ?? "andrestablarico@gmail.com", password = process.env.CONTRASENA ?? "";
const soloVincular = process.argv.includes("--solo-vincular");
const soloIds = (arg("--ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const retirar = process.argv.includes("--retirar");
if (!password && !soloVincular) { console.error("Falta CONTRASENA (contraseña del administrador)."); process.exit(1); }

const BASE = "Cresio/Convención";
// archivo → id, nombre visible, grupo
const MATERIALES: { path: string; id: string; name: string; group: string }[] = [
  { path: `${BASE}/plantillas-imprimibles/F1-ficha-panelista.pdf`, id: "formato-1-panelista", name: "Formato F1 · Ficha del panelista (mesa redonda)", group: "plantilla" },
  { path: `${BASE}/plantillas-imprimibles/F2-lienzo-mesa-redonda-A2.pdf`, id: "formato-2-lienzo", name: "Formato F2 · Lienzo único de la mesa redonda (A2)", group: "plantilla" },
  { path: `${BASE}/plantillas-imprimibles/F3-formato-tribu-A3.pdf`, id: "formato-3-tribu", name: "Formato F3 · Formato de tribu: OKR 2027 e iniciativas (A3)", group: "plantilla" },
  { path: `${BASE}/plantillas-imprimibles/F4-ficha-iniciativa.pdf`, id: "formato-4-iniciativa", name: "Formato F4 · Ficha de iniciativa estándar", group: "plantilla" },
  { path: `${BASE}/qr/hoja-qr-secciones.pdf`, id: "hoja-qr-secciones", name: "QR único de la convención (hoja para imprimir)", group: "plantilla" },
  { path: `${BASE}/presentaciones/pdf/01-conferencia-apertura-crecer-exige-elegir.pdf`, id: "deck-01-apertura", name: "Deck 01 · Conferencia de apertura «Crecer exige elegir»", group: "presentacion" },
  { path: `${BASE}/presentaciones/pdf/02-taller-mesa-redonda-estrategica.pdf`, id: "deck-02-mesa-redonda", name: "Deck 02 · Mesa redonda estratégica", group: "presentacion" },
  { path: `${BASE}/presentaciones/pdf/03-marco-y-laboratorio-okr-2027.pdf`, id: "deck-03-okr", name: "Deck 03 · Marco y laboratorio de OKR 2027", group: "presentacion" },
  { path: `${BASE}/presentaciones/pdf/04-iniciativas-criticas-priorizacion-portafolio.pdf`, id: "deck-04-iniciativas", name: "Deck 04 · Iniciativas críticas, priorización y portafolio", group: "presentacion" },
  { path: `${BASE}/presentaciones/pdf/05-conferencia-cierre-valentia-gerencial.pdf`, id: "deck-05-cierre", name: "Deck 05 · Conferencia de cierre «Valentía gerencial»", group: "presentacion" },
  { path: `${BASE}/guia-facilitacion-convencion.pdf`, id: "guia-facilitacion", name: "Guía de facilitación de la convención", group: "guia" },
];
/** Materiales que ya no existen (versión de ocho plantillas y el formato F5, acta y renuncias: no se formaliza ninguna renuncia en la convención): se retiran con --retirar. */
const RETIRADOS = ["formato-5-acta-renuncias", "plantilla-01-ficha-panelista", "plantilla-02-lienzo-maestro", "plantilla-03-tarjetas-kr", "plantilla-04-fichas-iniciativa", "plantilla-05-tarjeta-matriz", "plantilla-06-okr-por-tribu", "plantilla-07-pliego-portafolio", "plantilla-08-fichas-de-apoyo"];
// vínculos por momento (ids del itinerario)
const VINCULOS: Record<string, string[]> = {
  "d1-01": ["hoja-qr-secciones", "guia-facilitacion"], "d1-02": ["deck-01-apertura"], "d1-03": ["deck-01-apertura"],
  "d1-06": ["formato-1-panelista"],   "d1-13": ["formato-2-lienzo", "deck-02-mesa-redonda"], "d1-15": ["deck-02-mesa-redonda", "formato-1-panelista"], "d1-16": ["deck-02-mesa-redonda", "formato-1-panelista", "formato-2-lienzo"],
  "d1-17": ["deck-02-mesa-redonda", "formato-1-panelista", "formato-2-lienzo"], "d1-18": ["deck-02-mesa-redonda", "formato-1-panelista", "formato-2-lienzo"], "d1-19": ["deck-02-mesa-redonda", "formato-1-panelista", "formato-2-lienzo"],
  "d1-20": ["deck-02-mesa-redonda", "formato-2-lienzo"], "d1-21": ["formato-2-lienzo"], "d1-24": ["formato-2-lienzo"], "d1-26": ["formato-2-lienzo"],
  "d2-01": ["hoja-qr-secciones", "formato-3-tribu", "formato-4-iniciativa"], "d2-02": ["deck-03-okr"], "d2-03": ["deck-03-okr"], "d2-04": ["deck-03-okr", "formato-3-tribu"], "d2-05": ["formato-3-tribu"], "d2-06": ["formato-3-tribu"], "d2-07": ["formato-3-tribu"],
  "d2-09": ["formato-3-tribu"], "d2-10": ["deck-03-okr"], "d2-11": ["deck-04-iniciativas", "formato-4-iniciativa"],
  "d2-14": ["deck-04-iniciativas"], "d2-15": ["formato-4-iniciativa"], "d2-16": ["deck-04-iniciativas"], "d2-17": ["deck-04-iniciativas"],
  "d2-19": ["formato-3-tribu"], "d2-22": ["deck-05-cierre"],
};

async function main() {
  let cookie = "";
  const res = await fetch(`${origen}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!res.ok) throw new Error(`login: ${(await res.json().catch(() => ({}))).error ?? res.status}`);
  cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
  const act = await fetch(`${origen}/api/auth/empresa?slug=${slug}&next=/${slug}/panel`, { headers: { cookie }, redirect: "manual" });
  const c2 = (act.headers.get("set-cookie") ?? "").split(";")[0]; if (c2) cookie = c2;
  const h = { cookie };
  if (retirar) {
    for (const id of RETIRADOS) {
      const r = await fetch(`${origen}/api/td/itinerario`, { method: "POST", headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify({ op: "removeFile", id }) });
      console.log(r.ok ? `− retirado ${id}` : `· ${id}: ${(await r.json().catch(() => ({})) as { error?: string }).error ?? r.status}`);
    }
  }
  if (!soloVincular) {
    for (const m of MATERIALES) {
      if (soloIds.length && !soloIds.includes(m.id)) continue;
      if (!existsSync(m.path)) { console.log(`· falta ${m.path}, se omite`); continue; }
      const fd = new FormData();
      fd.append("file", new Blob([readFileSync(m.path)], { type: "application/pdf" }), basename(m.path));
      fd.append("id", m.id); fd.append("name", m.name); fd.append("group", m.group);
      const r = await fetch(`${origen}/api/td/itinerario/material`, { method: "POST", headers: h, body: fd });
      const j = await r.json().catch(() => ({}));
      console.log(r.ok ? `✓ ${m.name} (${Math.round(j.file?.size / 1024)} KB)` : `✗ ${m.name}: ${j.error ?? r.status}`);
    }
  }
  let n = 0;
  for (const [momentId, fileIds] of Object.entries(VINCULOS)) {
    const r = await fetch(`${origen}/api/td/itinerario`, { method: "POST", headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify({ op: "files", momentId, fileIds }) });
    if (r.ok) n++; else console.log(`✗ vínculo ${momentId}: ${(await r.json().catch(() => ({}))).error ?? r.status}`);
  }
  console.log(`vínculos aplicados: ${n} de ${Object.keys(VINCULOS).length}`);
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });

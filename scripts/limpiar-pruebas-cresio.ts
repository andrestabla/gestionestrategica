// Limpia las pruebas hechas en la plataforma antes de la convención, a través de la propia API (con auditoría):
// desvincula las iniciativas de prueba, elimina los KR de prueba y reinicia la calificación de las tribus
// con sesión o calificaciones (borra las calificaciones y deja la sesión sin abrir). No toca Dirección 3x3
// ni los objetivos de OKR.
//   read -rs "p?Contraseña del admin: "; echo; CONTRASENA="$p" npx tsx scripts/limpiar-pruebas-cresio.ts --origen https://gestionestrategica.io
// --kr MS-01,MAR-01: solo esos KR (por defecto, todos los KR de los objetivos de OKR).
// --ver: solo muestra qué haría.
export {};
const arg =(k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const slug = arg("--slug") ?? "cresio", origen = (arg("--origen") ?? "http://localhost:3000").replace(/\/$/, "");
const email = arg("--email") ?? "andrestablarico@gmail.com", password = process.env.CONTRASENA ?? "";
const soloVer = process.argv.includes("--ver");
const soloKr = (arg("--kr") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
if (!password) { console.error("Falta la contraseña: CONTRASENA=… (léela con read -rs, no la escribas en la línea de comandos)."); process.exit(1); }

type Ini = { id: string; name: string; kpi?: string; cmi: string; ownerId: string; [k: string]: unknown };
type Kpi = { code: string; name: string; cmi?: string };
type Obj = { id: string; okr?: boolean; parent?: string };

(async () => {
  const login = await fetch(`${origen}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!login.ok) { console.error("No se pudo entrar:", login.status, await login.text()); process.exit(1); }
  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
  const api = async (path: string, body?: unknown, method = body ? "POST" : "GET") => {
    const r = await fetch(`${origen}/${slug}${path}`, { method, headers: { cookie, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, body: j };
  };
  const cat = (await api("/api/td/catalogo")).body?.catalog as { objectives: Obj[]; kpis: Kpi[]; initiatives: Ini[]; responsibles: { id: string; dependencia: string }[] };
  if (!cat) { console.error("No se pudo leer el catálogo."); process.exit(1); }
  const okrIds = new Set(cat.objectives.filter((o) => o.okr).map((o) => o.id));
  const krs = cat.kpis.filter((k) => (soloKr.length ? soloKr.includes(k.code) : okrIds.has(k.cmi ?? "")));
  const codes = new Set(krs.map((k) => k.code));
  const vinculadas = cat.initiatives.filter((i) => i.kpi && codes.has(i.kpi));
  const prio = (await api("/api/td/priorizacion")).body as { evaluations: { iniId: string; by: string }[]; sessions: Record<string, { status: string }> };
  const tribusConSesion = new Set<string>(Object.keys(prio?.sessions ?? {}));
  for (const e of prio?.evaluations ?? []) { const i = cat.initiatives.find((x) => x.id === e.iniId); if (i?.ownerId) tribusConSesion.add(i.ownerId); }
  const nombre = (id: string) => cat.responsibles.find((r) => r.id === id)?.dependencia ?? id;

  console.log(`KR a eliminar (${krs.length}):`); for (const k of krs) console.log(`  ${k.code} · ${k.name}`);
  console.log(`Iniciativas a desvincular (${vinculadas.length}):`); for (const i of vinculadas) console.log(`  ${i.id} → ${i.kpi} · ${i.name}`);
  console.log(`Calificaciones a borrar: ${(prio?.evaluations ?? []).length} · tribus a reiniciar: ${[...tribusConSesion].map(nombre).join(", ") || "ninguna"}`);
  if (soloVer) return;

  let fallos = 0;
  for (const i of vinculadas) {
    // el objetivo de una iniciativa vinculada pasó a ser el del OKR; vuelve a su objetivo directivo (el padre del OKR) si lo hay
    const okr = cat.objectives.find((o) => o.id === i.cmi);
    const cmi = okr?.okr && okr.parent ? okr.parent : i.cmi;
    const r = await api("/api/td/catalogo", { entity: "initiative", op: "upsert", data: { ...i, kpi: "", cmi } });
    console.log(r.ok ? `✓ ${i.id} desvinculada` : `✗ ${i.id}: ${r.body?.error ?? r.status}`); if (!r.ok) fallos++;
  }
  for (const k of krs) {
    const r = await api("/api/td/catalogo", { entity: "kpi", op: "delete", data: { code: k.code } });
    console.log(r.ok ? `✓ ${k.code} eliminado` : `✗ ${k.code}: ${r.body?.error ?? r.status}`); if (!r.ok) fallos++;
  }
  for (const t of tribusConSesion) {
    const r = await api("/api/td/priorizacion", { tribe: t, session: "reiniciar" });
    console.log(r.ok ? `✓ ${nombre(t)}: calificación reiniciada (${r.body?.removed ?? 0} calificaciones borradas)` : `✗ ${nombre(t)}: ${r.body?.error ?? r.status}`); if (!r.ok) fallos++;
  }
  const fin = (await api("/api/td/priorizacion")).body as { evaluations: unknown[]; sessions: Record<string, unknown> };
  const catFin = (await api("/api/td/catalogo")).body?.catalog as { kpis: Kpi[]; initiatives: Ini[] };
  console.log(`\nQuedan: ${catFin.kpis.filter((k) => okrIds.has(k.cmi ?? "")).length} KR en los OKR · ${catFin.initiatives.filter((i) => i.kpi).length} iniciativas vinculadas · ${fin.evaluations.length} calificaciones · sesiones: ${JSON.stringify(fin.sessions)}`);
  if (fallos) { console.error(`${fallos} operación(es) fallaron.`); process.exit(1); }
})();

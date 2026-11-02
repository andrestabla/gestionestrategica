// Prueba de carga funcional: N usuarios simultáneos contra una instancia de la plataforma (local por defecto).
// Cada usuario entra, lee el panel, guarda su autoevaluación en tres tandas, califica una iniciativa con la
// matriz y lee notificaciones; al final se comprueba que todo quedó guardado. Mide latencias y errores.
//
//   BASE=http://localhost:3000 EMPRESA=andina USUARIOS=20 npx tsx scripts/carga.ts
//
// Requiere un admin local (ADMIN_EMAIL/ADMIN_PASSWORD en el entorno) para crear y borrar las cuentas de prueba,
// y DEMO_LOGIN=on en el servidor (las cuentas de prueba no tienen contraseña y entran con la demo).
import { PRACTICES } from "../src/data/mapa";

const BASE = process.env.BASE ?? "http://localhost:3000";
const EMPRESA = process.env.EMPRESA ?? "andina";
const N = Number(process.env.USUARIOS ?? 20);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "andrestablarico@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const DEMO_PASSWORD = "4shine-demo-2026";

type Jar = { cookie: string };
const lat: Record<string, number[]> = {};
const errores: string[] = [];
async function call(jar: Jar, method: string, path: string, body?: unknown, label = path): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const t0 = performance.now();
  const res = await fetch(`${BASE}${path}`, { method, headers: { "Content-Type": "application/json", cookie: jar.cookie }, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  const set = res.headers.get("set-cookie"); if (set) jar.cookie = set.split(";")[0];
  const json = await res.json().catch(() => ({}));
  (lat[label] ??= []).push(performance.now() - t0);
  if (!res.ok) errores.push(`${method} ${path} → ${res.status} ${json.error ?? ""}`);
  return { ok: res.ok, status: res.status, json };
}
const p = (xs: number[], q: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(q * s.length))]) : 0; };

async function main() {
  if (!ADMIN_PASSWORD) { console.error("Define ADMIN_PASSWORD (contraseña local del admin de prueba)."); process.exit(1); }
  const admin: Jar = { cookie: "" };
  const login = await call(admin, "POST", "/api/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (!login.ok) { console.error("No entró el admin:", login.json); process.exit(1); }
  await fetch(`${BASE}/api/auth/empresa?slug=${EMPRESA}&next=/${EMPRESA}/panel`, { headers: { cookie: admin.cookie }, redirect: "manual" }).then((r) => { const s = r.headers.get("set-cookie"); if (s) admin.cookie = s.split(";")[0]; });
  const correos = Array.from({ length: N }, (_, i) => `carga${String(i + 1).padStart(2, "0")}@prueba.test`);
  // cuentas de prueba (sin contraseña: entran con la demo)
  for (const [i, email] of correos.entries()) {
    const r = await call(admin, "POST", `/${EMPRESA}/api/td/users`, { email, name: `Carga Prueba ${i + 1}`, role: i % 3 === 0 ? "LIDER" : "DIRECTIVO" }, "crear usuario");
    if (!r.ok && r.status !== 409) console.error("crear", email, r.json);
  }
  const ini = (await call(admin, "GET", `/${EMPRESA}/api/td/priorizacion`, undefined, "GET priorizacion")).json as { ranking?: { id: string }[] };
  const iniId = ini.ranking?.[0]?.id;
  console.log(`${N} usuarios · empresa ${EMPRESA} · iniciativa ${iniId ?? "—"}`);

  const t0 = performance.now();
  const resultados = await Promise.all(correos.map(async (email, i) => {
    const jar: Jar = { cookie: "" };
    await new Promise((r) => setTimeout(r, i * 50));   // llegada escalonada en un segundo
    const l = await call(jar, "POST", "/api/auth/login", { email, password: DEMO_PASSWORD, tenant: EMPRESA }, "login");
    if (!l.ok) return { email, ok: false };
    await call(jar, "GET", `/${EMPRESA}/api/td/catalogo`, undefined, "GET catalogo");
    await call(jar, "GET", `/${EMPRESA}/api/td/notifications`, undefined, "GET notifications");
    // autoevaluación en tres tandas, como una persona que para y sigue
    const codes = PRACTICES.map((x) => x.code);
    for (const tanda of [codes.slice(0, 23), codes.slice(0, 46), codes]) {
      await call(jar, "POST", `/${EMPRESA}/api/td/f1`, { r: Object.fromEntries(tanda.map((c, k) => [c, 1 + ((k + i) % 5)])) }, "POST f1");
      await call(jar, "GET", `/${EMPRESA}/api/td/f1`, undefined, "GET f1");
    }
    if (iniId) await call(jar, "POST", `/${EMPRESA}/api/td/priorizacion`, { id: iniId, evaluation: { scores: { D: 1 + (i % 4), E: 2, M: 3, L: 4 }, type: { contribucion: "ESTRATEGICO", profundidad: "ESTRATEGICO", alcance: "ESTRATEGICO", permanencia: "TACTICO" } } }, "POST evaluacion");
    await call(jar, "GET", `/${EMPRESA}/api/td/notifications`, undefined, "GET notifications");
    return { email, ok: true };
  }));
  const total = Math.round(performance.now() - t0);

  // comprobación: todo lo escrito está
  const f1 = (await call(admin, "GET", `/${EMPRESA}/api/td/f1`, undefined, "GET f1 (admin)")).json as { responses?: { email: string; r: Record<string, number> }[] };
  const completas = correos.filter((e) => (f1.responses ?? []).some((r) => r.email === e && Object.keys(r.r).length === PRACTICES.length)).length;
  const prio = iniId ? (await call(admin, "GET", `/${EMPRESA}/api/td/priorizacion?id=${iniId}`, undefined, "GET priorizacion")).json as { evaluations?: { by: string }[] } : { evaluations: [] };
  const evaluadas = correos.filter((e) => (prio.evaluations ?? []).some((x) => x.by === e)).length;

  console.log(`\nDuración total: ${total} ms · usuarios que entraron: ${resultados.filter((r) => r.ok).length}/${N}`);
  console.log(`Autoevaluaciones completas guardadas: ${completas}/${N} · evaluaciones de la matriz: ${evaluadas}/${N}`);
  console.log(`Errores HTTP: ${errores.length}`); for (const e of [...new Set(errores)].slice(0, 10)) console.log("  ", e);
  console.log("\nLatencias (ms) · p50 · p90 · p99 · máx · n");
  for (const [k, xs] of Object.entries(lat)) console.log(`  ${k.padEnd(20)} ${String(p(xs, 0.5)).padStart(5)} ${String(p(xs, 0.9)).padStart(6)} ${String(p(xs, 0.99)).padStart(6)} ${String(Math.round(Math.max(...xs))).padStart(6)} ${String(xs.length).padStart(5)}`);

  // limpieza: las cuentas de prueba se eliminan con toda su información
  if (process.env.CONSERVAR !== "1") {
    for (const email of correos) await call(admin, "DELETE", `/${EMPRESA}/api/td/users?email=${encodeURIComponent(email)}`, undefined, "borrar usuario");
    console.log("\nCuentas de prueba eliminadas (y sus datos).");
  }
  process.exit(completas === N && evaluadas === (iniId ? N : 0) && errores.length === 0 ? 0 : 2);
}
main().catch((e) => { console.error(e); process.exit(1); });

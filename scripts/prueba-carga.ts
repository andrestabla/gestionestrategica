// Prueba de carga de la convención: más de 100 personas con sesión leyendo y más de 10
// editando y guardando a la vez. Corre contra producción con la cuenta del admin:
//
//   read -rs "CONTRASENA?Contraseña del admin: "; echo; CONTRASENA="$CONTRASENA" \
//     npx tsx scripts/prueba-carga.ts --origen https://gestionestrategica.io [--lectores 100] [--editores 12] [--segundos 40]
//
// Qué hace, en orden:
//   1. Entra como admin y crea una empresa desechable «Prueba de carga» (plantilla demo, modo convención,
//      regla Cresio, cuatro palancas con tribu). Nada de la prueba toca los datos de Cresio: de Cresio solo se lee.
//   2. Ráfaga de entradas por el QR: todos los lectores y editores entran a la vez (cada uno crea su cuenta y su sesión),
//      como al inicio del día 2.
//   3. Durante N segundos, a la vez: los lectores recorren las pantallas (catálogo, priorización, itinerario,
//      notificaciones y la página de la convención) con su propia sesión, una parte sobre los datos reales de Cresio;
//      los editores (líderes de tribu por QR) crean y actualizan iniciativas y resultados clave, abren la calificación
//      de su tribu, califican y comprueban que lo guardado se lee de vuelta (consistencia entre instancias).
//   4. Borra la empresa desechable con sus cuentas y resume latencias (p50, p95, máximo) y errores por operación.
const arg = (k: string, d?: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
// --origen admite varias URL separadas por coma: cada petición va a una al azar (simula varias instancias)
const ORIGENES = (arg("--origen") ?? "http://localhost:3000").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
const origenDe = () => ORIGENES[Math.floor(Math.random() * ORIGENES.length)];
const origen = ORIGENES[0];
// --token <qr>: usa una empresa desechable ya creada (slug prueba-carga) sin entrar como admin ni leer datos reales
const TOKEN_FIJO = arg("--token");
const slugReal = arg("--slug", "cresio")!, email = arg("--email", "andrestablarico@gmail.com")!, password = process.env.CONTRASENA ?? "";
const LECTORES = Number(arg("--lectores", "100")), EDITORES = Number(arg("--editores", "12")), SEGUNDOS = Number(arg("--segundos", "40"));
const SLUG = "prueba-carga";
if (!password && !TOKEN_FIJO) { console.error("Falta CONTRASENA (contraseña del administrador)."); process.exit(1); }

type Muestra = { op: string; ms: number; ok: boolean; status: number };
const muestras: Muestra[] = [];
const fallos: string[] = [];
async function medir<T>(op: string, fn: () => Promise<Response>, parse: (r: Response) => Promise<T>): Promise<T | null> {
  const t0 = performance.now();
  try {
    const r = await fn(); const ms = performance.now() - t0;
    muestras.push({ op, ms, ok: r.ok, status: r.status });
    if (!r.ok) { const e = await r.text().catch(() => ""); if (fallos.length < 20) fallos.push(`${op} → ${r.status} ${e.slice(0, 140)}`); return null; }
    return await parse(r);
  } catch (e) {
    muestras.push({ op, ms: performance.now() - t0, ok: false, status: 0 }); if (fallos.length < 20) fallos.push(`${op} → ${(e as Error).message}`); return null;
  }
}
const json = (r: Response) => r.json();
const texto = (r: Response) => r.text();
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const cookieDe = (r: Response) => (r.headers.get("set-cookie") ?? "").split(";")[0];

async function login(): Promise<string> {
  const r = await fetch(`${origen}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!r.ok) throw new Error(`login: ${(await r.json().catch(() => ({}))).error ?? r.status}`);
  return cookieDe(r);
}
async function activar(cookie: string, slug: string): Promise<string> {
  const r = await fetch(`${origen}/api/auth/empresa?slug=${slug}&next=/${slug}/panel`, { headers: { cookie }, redirect: "manual" });
  const c = cookieDe(r); return c || cookie;
}
// ninguna petición espera más de 30 s: una que no responde cuenta como error en vez de colgar la prueba
const TIMEOUT_MS = 30_000;
const get = (cookie: string, path: string) => fetch(`${origenDe()}${path}`, { headers: { cookie }, signal: AbortSignal.timeout(TIMEOUT_MS) });
const post = (cookie: string, path: string, body: unknown, method = "POST") => fetch(`${origenDe()}${path}`, { method, headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });

async function main() {
  console.log(`Prueba de carga contra ${ORIGENES.join(" + ")} · ${LECTORES} lectores · ${EDITORES} editores · ${SEGUNDOS} s`);
  const admin = TOKEN_FIJO ? "" : await login();
  const cookieReal = TOKEN_FIJO ? "" : await activar(admin, slugReal);
  let token = TOKEN_FIJO ?? "";
  if (!TOKEN_FIJO) {
    // 1 · empresa desechable (si quedó una de otra corrida, se borra antes)
    await post(admin, `/api/td/empresas?slug=${SLUG}`, {}, "DELETE").catch(() => null);
    const creada = await post(admin, "/api/td/empresas", { name: "Prueba de carga", slug: SLUG, template: "demo", mode: "convencion", typeRule: "cresio", country: "EC", currency: "USD",
      horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }],
      levers: [{ id: "MS", name: "Market Share", order: 1, ownerId: "R01" }, { id: "FID", name: "Fidelización", order: 2, ownerId: "R02" }, { id: "MAD", name: "Madurez", order: 3, ownerId: "R03" }, { id: "MAR", name: "Margen", order: 4, ownerId: "R05" }] });
    if (!creada.ok) throw new Error(`crear empresa: ${(await creada.json().catch(() => ({}))).error ?? creada.status}`);
    const cookiePrueba = await activar(await login(), SLUG);
    const acceso = await (await post(cookiePrueba, "/api/td/convencion/acceso", { section: "convencion" })).json();
    token = acceso?.access?.[0]?.token; if (!token) throw new Error("sin token de acceso QR");
  }
  const TRIBUS = ["R01", "R02", "R03", "R05"];
  try {
    // 2 · ráfaga de entradas por el QR
    console.log(`\n① Entrada por el QR: ${LECTORES + EDITORES} personas a la vez…`);
    const entrar = (n: number, rol: "miembro" | "lider") => medir("qr-entrada", () => fetch(`${origenDe()}/api/auth/acceso`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({ tenant: SLUG, token, name: `${rol === "lider" ? "Editor" : "Lector"} de carga ${n}`, email: `carga-${rol}-${n}@ejemplo.test`, consent: true, responsibleId: TRIBUS[n % TRIBUS.length], entryRole: rol }) }),
      async (r) => ({ cookie: cookieDe(r), tribu: TRIBUS[n % TRIBUS.length] }));
    const t0 = performance.now();
    const sesiones = await Promise.all([...Array.from({ length: LECTORES }, (_, n) => entrar(n, "miembro")), ...Array.from({ length: EDITORES }, (_, n) => entrar(n, "lider"))]);
    const lectores = sesiones.slice(0, LECTORES).filter(Boolean) as { cookie: string; tribu: string }[];
    const editores = sesiones.slice(LECTORES).filter(Boolean) as { cookie: string; tribu: string }[];
    console.log(`   ${lectores.length} lectores y ${editores.length} editores con sesión en ${((performance.now() - t0) / 1000).toFixed(1)} s`);
    // 3 · lectura y edición simultáneas
    console.log(`\n② ${SEGUNDOS} s de lectura y edición simultáneas…`);
    const fin = Date.now() + SEGUNDOS * 1000;
    const lector = async (s: { cookie: string }, real: boolean) => {
      const c = real ? cookieReal : s.cookie, slug = real ? slugReal : SLUG, tag = real ? "lectura-cresio" : "lectura";
      while (Date.now() < fin) {
        await medir(`${tag}:catalogo`, () => get(c, "/api/td/catalogo"), json);
        await medir(`${tag}:priorizacion`, () => get(c, "/api/td/priorizacion"), json);
        await medir(`${tag}:itinerario`, () => get(c, "/api/td/itinerario"), json);
        await medir(`${tag}:notificaciones`, () => get(c, "/api/td/notifications"), json);
        await medir(`${tag}:pagina`, () => get(c, `/${slug}/panel/convencion?t=priorizacion`), texto);
        await sleep(500 + Math.random() * 1000);
      }
    };
    const editor = async (s: { cookie: string; tribu: string }, n: number) => {
      const c = s.cookie; let ronda = 0;
      // su OKR: objetivo de la palanca de su tribu (uno por editor), un KR y la calificación abierta
      const lever = ["MS", "FID", "MAD", "MAR"][TRIBUS.indexOf(s.tribu)];
      const obj = await medir("editar:objetivo", () => post(c, "/api/td/catalogo", { entity: "objective", op: "upsert", data: { perspective: "clientes", name: `Objetivo de carga del editor ${n} para 2027`, kpis: [], lever, horizon: "H1", okr: true } }), json);
      const objId: string | undefined = obj?.id;
      if (objId) await medir("editar:kr", () => post(c, "/api/td/catalogo", { entity: "kpi", op: "upsert", data: { code: `CG${n}-01`, cmi: objId, name: `Resultado clave de carga ${n}`, unit: "%", baseline: 10, target: 20, ownerId: s.tribu, due: "2027-T4", frequency: "Trimestral", goodDirection: "up", definition: "Fórmula de prueba / fuente de prueba", formula: "a / b × 100", source: "prueba", series: [], line: 1 } }), json);
      // varios editores comparten tribu: si otro ya abrió la calificación, el 422 «ya está abierta» no es un fallo
      await medir("editar:abrir-calificacion", async () => { const r = await post(c, "/api/td/priorizacion", { tribe: s.tribu, session: "abrir" }); return r.status === 422 && /desde el estado «abierta»/.test(await r.clone().text()) ? new Response("{}", { status: 200 }) : r; }, json);
      while (Date.now() < fin) {
        ronda++;
        const ini = await medir("editar:iniciativa-crear", () => post(c, "/api/td/catalogo", { entity: "initiative", op: "upsert", data: { name: `Iniciativa de carga ${n}-${ronda}`, capability: "DIR-1", cmi: objId ?? "OE-01", ownerId: s.tribu, horizon: "H1", kpi: objId ? `CG${n}-01` : "", objetivo: "Qué logra: prueba de carga" } }), json);
        const id: string | undefined = ini?.id;
        if (id) {
          await medir("editar:iniciativa-actualizar", () => post(c, "/api/td/catalogo", { entity: "initiative", op: "upsert", data: { id, name: `Iniciativa de carga ${n}-${ronda} (actualizada)`, capability: "DIR-1", cmi: objId ?? "OE-01", ownerId: s.tribu, horizon: "H1", kpi: objId ? `CG${n}-01` : "", start: "2027-T2", end: "2027-T4", objetivo: "Qué logra: prueba de carga" } }), json);
          if (objId) await medir("editar:calificar", () => post(c, "/api/td/priorizacion", { id, evaluation: { scores: { D: 3, E: 3, M: 3, L: 2 }, type: {} } }), json);
          // consistencia: lo guardado se lee de vuelta (puede atender otra instancia)
          const vista = await medir("editar:leer-de-vuelta", () => get(c, "/api/td/catalogo"), json);
          const hallada = vista?.catalog?.initiatives?.find?.((i: { id: string; name: string }) => i.id === id);
          if (!hallada || !/actualizada/.test(hallada.name)) { if (fallos.length < 20) fallos.push(`consistencia: ${id} no se leyó actualizada de vuelta`); muestras.push({ op: "consistencia", ms: 0, ok: false, status: 0 }); }
          else muestras.push({ op: "consistencia", ms: 0, ok: true, status: 200 });
        }
        await sleep(300 + Math.random() * 700);
      }
    };
    const nReal = cookieReal ? Math.min(20, Math.floor(lectores.length / 5)) : 0;
    await Promise.all([...lectores.map((s, i) => lector(s, i < nReal)), ...editores.map((s, n) => editor(s, n))]);
  } finally {
    // 4 · limpieza
    if (admin) { const del = await post(admin, `/api/td/empresas?slug=${SLUG}`, {}, "DELETE"); console.log(`\n③ Empresa desechable ${del.ok ? "borrada con sus cuentas" : "NO borrada: elimínala en Administración → Empresas"}`); }
    else console.log("\n③ Empresa desechable creada aparte: bórrala con el script que la creó.");
  }
  // resumen
  const ops = [...new Set(muestras.map((m) => m.op))];
  const q = (xs: number[], p: number) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  console.log("\nOperación".padEnd(34) + "n".padStart(6) + "errores".padStart(9) + "p50 ms".padStart(9) + "p95 ms".padStart(9) + "máx ms".padStart(9));
  for (const op of ops) {
    const xs = muestras.filter((m) => m.op === op), err = xs.filter((m) => !m.ok).length, ms = xs.filter((m) => m.ok).map((m) => m.ms);
    console.log(op.padEnd(34) + String(xs.length).padStart(6) + String(err).padStart(9) + (op === "consistencia" ? "—".padStart(9) + "—".padStart(9) + "—".padStart(9) : q(ms, 0.5).toFixed(0).padStart(9) + q(ms, 0.95).toFixed(0).padStart(9) + Math.max(0, ...ms).toFixed(0).padStart(9)));
  }
  const total = muestras.length, errores = muestras.filter((m) => !m.ok).length;
  console.log(`\nTotal: ${total} peticiones · ${errores} errores (${((100 * errores) / Math.max(1, total)).toFixed(2)} %)`);
  if (fallos.length) { console.log("Primeros fallos:"); for (const f of fallos) console.log("  · " + f); }
  console.log(errores === 0 ? "\nRESULTADO: OK" : errores / total < 0.01 ? "\nRESULTADO: aceptable (menos del 1 % de errores); revisar los fallos" : "\nRESULTADO: CON PROBLEMAS");
}
main().catch((e) => { console.error(e.message); process.exit(1); });

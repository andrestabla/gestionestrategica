"use client";

// /login — acceso dirigido por el branding (Administración → Branding):
// layout (imagen izq/der o centrado), textos con visibilidad, overlay,
// imágenes en rotación aleatoria, logos y loader. Sin configuración
// guardada, rinde el tema 4Shine por defecto.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlgoritmoMark } from "@/components/logo";
import { LogIn, Loader2 } from "lucide-react";

type Branding = {
  platformName: string; showPlatformName: boolean;
  institutionName: string; shortName: string; tagline: string;
  logoLight: string | null; logoDark: string | null; favicon: string | null;
  primary: string; secondary: string; accent: string;
  font: string; radius: string; buttonStyle: "solid" | "outline";
  loginLayout: "image-left" | "image-right" | "centered";
  loginTitle: string; showLoginTitle: boolean;
  loginWelcome: string; showLoginWelcome: boolean;
  loginSupport: string; showLoginSupport: boolean;
  heroTitle: string; showHeroTitle: boolean;
  heroMessages: string[]; showHeroMessages: boolean;
  heroSupport: string; showHeroSupport: boolean;
  overlayColor: string; overlayOpacity: number;
  backgroundImages: string[]; panelImages: string[];
  loader: string | null; loaderText: string; showLoaderText: boolean;
};

const pick = <T,>(xs: T[] | undefined): T | null => (xs?.length ? xs[Math.floor(Math.random() * xs.length)] : null);

export type LoginCompany = { slug: string; name: string; shortName: string };

export function LoginClient({ tenant, company }: { tenant: string | null; company: LoginCompany | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recover, setRecover] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState<string | null>(null);
  const recoverNow = async () => {
    setBusy(true); setError(null); setRecoverMsg(null);
    try {
      const res = await fetch("/api/auth/recuperar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, tenant: tenant ?? undefined }) });
      const j = await res.json().catch(() => null);
      if (!res.ok) setError(j?.error ?? `Error ${res.status}`); else setRecoverMsg(j.message);
    } catch { setError("No se pudo conectar con el servidor."); }
    setBusy(false);
  };
  const [b, setB] = useState<Branding | null>(null);

  useEffect(() => {
    fetch("/api/branding").then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.branding && setB(j.branding))
      .catch(() => null);
  }, []);

  // imágenes y mensaje en rotación aleatoria (una por carga)
  const panelImg = useMemo(() => (b ? pick(b.panelImages) ?? "/back.jpg" : "/back.jpg"), [b]);
  const bgImg = useMemo(() => (b ? pick(b.backgroundImages) ?? pick(b.panelImages) ?? "/back.jpg" : "/back.jpg"), [b]);
  const heroMsg = useMemo(() => (b?.showHeroMessages ? pick(b.heroMessages) : null), [b]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, tenant: tenant ?? undefined }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const u = data?.user;
      // cada empresa tiene su ruta: /empresa/panel; el admin sin empresa elige en /empresas
      router.push(u?.company?.slug ? `/${u.company.slug}/panel` : u?.role === "ADMIN" ? "/empresas" : "/panel");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "No fue posible iniciar sesión.");
      setBusy(false);
    }
  };

  // valores efectivos con respaldo en el tema por defecto
  const layout = b?.loginLayout ?? "image-left";
  const overlayHex = b
    ? `${b.overlayColor}${Math.round(b.overlayOpacity * 2.55).toString(16).padStart(2, "0")}`
    : null;
  const fontFamily = b && b.font !== "Inter" ? `"${b.font}", Inter, sans-serif` : undefined;
  const radius = b?.radius ?? "14px";
  const primary = b?.primary ?? "#1a2d5a";

  // favicon + fuente del branding
  useEffect(() => {
    if (!b) return;
    if (b.favicon) {
      let icon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.appendChild(icon); }
      icon.href = b.favicon;
    }
    if (b.font && b.font !== "Inter" && !document.getElementById("pgtd-login-font")) {
      const link = document.createElement("link");
      link.id = "pgtd-login-font";
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(b.font)}:wght@400;600;700;800&display=swap`;
      document.head.appendChild(link);
    }
  }, [b]);

  /* ── bloque de marca sobre la imagen ── */
  const hero = (
    <div className="relative flex h-full flex-col justify-between">
      <div className="flex items-center gap-2.5">
        {b?.logoDark || b?.logoLight ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(b!.logoDark ?? b!.logoLight)!} alt="" className="h-8 max-w-[200px] object-contain" />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/4shine-logo-blanco.png" alt="4Shine" className="h-8 object-contain" />
          </>
        )}
        {b?.showPlatformName && !b?.logoDark && !b?.logoLight && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
            · {b.platformName}
          </span>
        )}
      </div>
      <div>
        {(b?.showHeroTitle ?? true) && (
          <h1 className="mt-4 max-w-[20ch] text-[34px] font-extrabold leading-[1.15] tracking-tight text-white">
            {b ? b.heroTitle : (
              <>Plataforma de gestión estratégica{" "}
                <span style={{ color: "#D4AF37" }}>4Shine Empresas</span></>
            )}
          </h1>
        )}
        {heroMsg && (
          <p className="mt-5 max-w-md border-l-2 pl-4 text-[14px] italic leading-relaxed text-white/85"
            style={{ borderColor: b?.accent ?? "#4fd0ec" }}>
            “{heroMsg}”
          </p>
        )}
      </div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/60">
        {b?.showHeroSupport && b.heroSupport ? b.heroSupport : (b?.tagline ?? "Dirección elige. Liderazgo moviliza. Ejecución cumple. Multiplicación escala.")}
      </div>
    </div>
  );

  /* ── formulario ── */
  const form = (
    <div className="w-full max-w-[400px]">
      <div className="mb-7 flex items-center gap-2.5">
        {b?.logoLight ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.logoLight} alt="" className="h-9 max-w-[220px] object-contain" />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/4shine-logo-negro.png" alt="4Shine" className="h-7 object-contain" />
            <span className="text-[15px] font-extrabold text-ink">
              {b?.showPlatformName ? b.platformName : "4Shine Empresas"}
            </span>
          </>
        )}
      </div>
      <div className="kicker mb-1.5" style={b ? { color: b.accent } : undefined}>Acceso a la plataforma</div>
      {(b?.showLoginTitle ?? true) && (
        <h2 className="text-[24px] font-extrabold tracking-tight text-ink">
          {b?.loginTitle ?? "Iniciar sesión"}
        </h2>
      )}
      {(b?.showLoginWelcome ?? true) && (
        <p className="mt-1 text-[13px] text-muted">
          {b?.loginWelcome ?? "Entra con la cuenta que te asignó el advisor de tu empresa."}
        </p>
      )}

      {company && (
        <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-[12px] font-semibold text-ink">
          <span className="grid h-6 w-6 place-items-center rounded-lg text-[10px] font-extrabold text-white" style={{ background: "linear-gradient(135deg, var(--cyan-deep), var(--navy))" }}>{company.shortName.slice(0, 2).toUpperCase()}</span>
          Acceso de {company.name}
        </div>
      )}
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block">
          <span className="label">Correo</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="username" required className="input mt-1.5" />
        </label>
        <label className="block">
          <span className="label">Contraseña</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" required className="input mt-1.5" />
        </label>

        {error && (
          <p className="rounded-lg px-3.5 py-2.5 text-[12.5px]"
            style={{ background: "color-mix(in srgb, var(--bad) 8%, white)", color: "var(--bad)" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={busy}
          className="flex w-full items-center justify-center gap-2 py-2.5 text-[13.5px] font-bold transition-all disabled:opacity-60"
          style={{
            borderRadius: `calc(${radius} / 1.2)`,
            background: (b?.buttonStyle ?? "solid") === "solid" ? primary : "transparent",
            color: (b?.buttonStyle ?? "solid") === "solid" ? "#fff" : primary,
            boxShadow: (b?.buttonStyle ?? "solid") === "outline" ? `inset 0 0 0 1.5px ${primary}` : undefined,
          }}>
          {busy ? (
            b?.loader ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.loader} alt="" className="h-5 w-5 object-contain" />
                {b.showLoaderText && b.loaderText}
              </>
            ) : (
              <><Loader2 size={15} className="animate-spin" /> {b?.showLoaderText ? (b?.loaderText ?? "Entrando") : ""}</>
            )
          ) : (
            <><LogIn size={15} /> Entrar a la plataforma</>
          )}
        </button>
      </form>

      {(b?.showLoginSupport && b.loginSupport) ? (
        <p className="mt-4 text-[11.5px] text-faint">{b.loginSupport}</p>
      ) : null}

      {!tenant && (
        <p className="mt-6 text-[11.5px] leading-snug text-faint">Acceso del administrador de la plataforma. Las cuentas de cada empresa entran por el enlace de su empresa (/empresa/login) o por el QR de su sección.</p>
      )}
      <div className="mt-4 text-[12px]">
        {!recover ? (
          <button type="button" onClick={() => { setRecover(true); setRecoverMsg(null); }} className="font-semibold text-cyan-deep hover:underline">¿Olvidaste tu contraseña?</button>
        ) : (
          <div className="rounded-xl bg-surface-2 px-3.5 py-3">
            <p className="text-[12px] text-ink-soft">Escribe arriba tu correo y te enviamos un enlace para crear una contraseña nueva (vale 60 minutos).</p>
            {recoverMsg ? <p className="mt-2 text-[12px] font-semibold text-ok">{recoverMsg}</p> : (
              <button type="button" onClick={recoverNow} disabled={busy || !email.includes("@")} className="btn-primary mt-2 !py-2 text-[12px] disabled:opacity-40">{busy ? "Enviando…" : "Enviar enlace"}</button>
            )}
            <button type="button" onClick={() => setRecover(false)} className="ml-3 text-[11.5px] text-faint hover:underline">Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );

  /* ── layouts ── */

  if (layout === "centered") {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-6 py-10"
        style={{ fontFamily, background: `url(${bgImg}) center/cover` }}>
        <div aria-hidden className="absolute inset-0"
          style={{ background: overlayHex ?? "rgba(13,24,48,.72)" }} />
        <div className="relative w-full max-w-[430px] bg-surface p-8 shadow-2xl"
          style={{ borderRadius: `calc(${radius} * 1.4)` }}>
          {form}
        </div>
      </div>
    );
  }

  const imagePanel = (
    <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden p-10 lg:flex">
      <div aria-hidden className="absolute inset-0"
        style={{ background: `url(${panelImg}) center/cover` }} />
      <div aria-hidden className="absolute inset-0"
        style={{
          background: overlayHex
            ?? "linear-gradient(160deg, rgba(13,24,48,.88) 0%, rgba(26,45,90,.72) 45%, rgba(11,111,136,.55) 100%)",
        }} />
      {hero}
    </div>
  );

  return (
    <div className={`flex min-h-screen ${layout === "image-right" ? "flex-row-reverse" : ""}`}
      style={{ fontFamily }}>
      {imagePanel}
      <div className="flex flex-1 items-center justify-center bg-bg px-6 py-10">
        {form}
      </div>
    </div>
  );
}

"use client";

// Tour guiado de la empresa y aviso de la cuenta de demostración de solo lectura. El tour se administra en
// Administración → Tour (src/app/panel/admin/[[...slug]]/tour-tab.tsx): pasos con título, texto, la pantalla a la que
// lleva y, si se quiere, el elemento que resalta. Se abre solo la primera vez para quien aplica (cuentas de solo
// lectura o todas, según la empresa) y siempre se puede abrir con el botón «Tour» de la barra superior.

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Compass, X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { claveTourVisto, type Tour } from "@/lib/tour";
import { avisar } from "@/components/feedback";
import { SOLO_LECTURA, bloqueaSoloLectura } from "@/lib/solo-lectura";

type TourApi = { tour: Tour | null; aplica: boolean; lectura: boolean; puedeEditar: boolean };

const leer = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento: el tour volverá a abrirse */ } };
/** Ruta sin el prefijo de la empresa ni la consulta, para comparar pantallas. */
const pantalla = (p: string) => p.replace(/^\/[a-z0-9-]+(?=\/panel)/, "").split("?")[0].replace(/\/$/, "") || "/panel";

/** Botón «Tour» de la barra superior y la tarjeta del paso en curso. */
export function TourControl({ base, slug, email }: { base: string; slug: string | null; email: string }) {
  const router = useRouter();
  const path = usePathname();
  const [data, setData] = useState<TourApi | null>(null);
  const [paso, setPaso] = useState<number | null>(null);
  const resaltado = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/td/tour", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j: TourApi | null) => {
      if (!vivo || !j) return;
      setData(j);
      // se abre solo la primera vez (por versión del tour) para quien aplica
      if (j.aplica && j.tour && slug && !leer(claveTourVisto(slug, email, j.tour.version))) setTimeout(() => vivo && setPaso(0), 700);
    }).catch(() => {});
    return () => { vivo = false; };
  }, [slug, email]);

  const tour = data?.tour ?? null;
  const pasos = tour?.pasos ?? [];
  const actual = paso !== null ? pasos[paso] ?? null : null;

  const cerrar = useCallback((terminado: boolean) => {
    if (tour && slug) guardar(claveTourVisto(slug, email, tour.version), terminado ? "terminado" : "saltado");
    setPaso(null);
  }, [tour, slug, email]);

  // cada paso lleva a su pantalla y, si tiene ancla, la resalta
  useEffect(() => {
    if (!actual) return;
    const destino = actual.ruta.split("?")[0].replace(/\/$/, "") || "/panel";
    if (pantalla(path) !== destino) { router.push(`${base}${actual.ruta}`); return; }
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!actual.ancla) return;
    const t = setTimeout(() => {
      let el: HTMLElement | null = null;
      try { el = document.querySelector(actual.ancla!) as HTMLElement | null; } catch { el = null; }
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.outline = "3px solid var(--gold)"; el.style.outlineOffset = "4px"; el.style.borderRadius = el.style.borderRadius || "12px";
      resaltado.current = el;
    }, 700);
    return () => { clearTimeout(t); if (resaltado.current) { resaltado.current.style.outline = ""; resaltado.current.style.outlineOffset = ""; resaltado.current = null; } };
  }, [actual, path, base, router]);

  useEffect(() => {
    if (paso === null) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar(false);
      else if (e.key === "ArrowRight") setPaso((n) => (n !== null && n < pasos.length - 1 ? n + 1 : n));
      else if (e.key === "ArrowLeft") setPaso((n) => (n !== null && n > 0 ? n - 1 : n));
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [paso, pasos.length, cerrar]);

  if (!tour?.activo || !pasos.length) return null;
  const ultimo = paso === pasos.length - 1;
  return (
    <>
      <button type="button" onClick={() => setPaso(0)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] font-bold text-ink hover:border-cyan-deep hover:text-cyan-deep" title="Recorrido guiado por la plataforma" data-tour="boton-tour">
        <Compass size={14} /> <span className="hidden sm:inline">Tour</span>
      </button>
      {/* la tarjeta va al cuerpo del documento: la barra superior usa desenfoque de fondo, que encierra a los elementos fijos */}
      {actual && paso !== null && typeof document !== "undefined" && createPortal(
        <div role="dialog" aria-modal="false" aria-labelledby="tour-titulo"
          className="fixed inset-x-3 bottom-3 z-[60] rounded-2xl border border-line bg-surface p-5 shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[400px]"
          style={{ boxShadow: "0 24px 60px -20px rgba(15,23,42,.45)" }}>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: "linear-gradient(135deg, var(--cyan-deep), var(--navy))" }}><Compass size={17} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-faint">Tour · paso {paso + 1} de {pasos.length}</div>
              <h2 id="tour-titulo" className="mt-0.5 text-[15.5px] font-extrabold leading-snug text-ink">{actual.titulo}</h2>
            </div>
            <button type="button" onClick={() => cerrar(false)} className="text-faint hover:text-ink" aria-label="Salir del tour"><X size={17} /></button>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{actual.texto}</p>
          <div className="mt-4 flex items-center gap-1">
            {pasos.map((p, i) => <button key={p.id} type="button" onClick={() => setPaso(i)} aria-label={`Ir al paso ${i + 1}`} className="h-1.5 flex-1 rounded-full" style={{ background: i <= paso ? "var(--cyan-deep)" : "var(--line)" }} />)}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={() => cerrar(false)} className="text-[12px] font-semibold text-muted hover:text-ink">Salir</button>
            <span className="ml-auto" />
            {paso > 0 && <button type="button" onClick={() => setPaso(paso - 1)} className="btn-ghost btn-sm text-[12px]"><ChevronLeft size={14} /> Anterior</button>}
            {ultimo
              ? <button type="button" onClick={() => cerrar(true)} className="btn-primary btn-sm text-[12px]">Terminar</button>
              : <button type="button" onClick={() => setPaso(paso + 1)} className="btn-primary btn-sm text-[12px]">Siguiente <ChevronRight size={14} /></button>}
          </div>
        </div>, document.body,
      )}
    </>
  );
}

/** Aviso permanente de la cuenta de demostración de solo lectura. Además, ninguna escritura sale del navegador: se
    responde aquí mismo con el aviso (el servidor también las rechaza, esto solo evita esperas y errores confusos). */
export function AvisoSoloLectura() {
  useEffect(() => {
    const w = window as Window & { __soloLectura?: boolean };
    if (w.__soloLectura) return;
    w.__soloLectura = true;
    const original = window.fetch.bind(window);
    let ultimoAviso = 0;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const metodo = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (bloqueaSoloLectura(metodo, url)) {
        if (Date.now() - ultimoAviso > 4000) { ultimoAviso = Date.now(); avisar("Cuenta de demostración: puedes recorrer todo, pero los cambios no se guardan.", "warn"); }
        return Promise.resolve(new Response(JSON.stringify({ error: SOLO_LECTURA, soloLectura: true }), { status: 403, headers: { "Content-Type": "application/json" } }));
      }
      return original(input, init);
    };
  }, []);
  return (
    <div className="flex items-center justify-center gap-2 border-b border-gold/30 bg-gold-wash px-4 py-1.5 text-center text-[12px] font-semibold text-ink-soft" role="status">
      <Eye size={13} className="shrink-0 text-[color:var(--gold)]" />
      Cuenta de demostración · solo lectura: recorre la plataforma con libertad; los cambios no se guardan.
    </div>
  );
}

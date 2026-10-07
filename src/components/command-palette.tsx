"use client";

// Buscador global (⌘K / Ctrl+K): prácticas del mapa, dimensiones,
// frameworks, KPI, iniciativas, tareas, personas y módulos — todo navega a
// su ruta profunda. Índice local: no requiere red.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PRACTICES, DIMS, FRAMEWORKS } from "@/data/mapa";
import { useCatalog } from "@/components/catalog-context";
import { useBase } from "@/components/user-context";
import type { TenantView } from "@/lib/vista";
import { Search, CornerDownLeft } from "lucide-react";

type Entry = {
  id: string;
  group: string;
  title: string;
  sub: string;
  href: string;
  haystack: string;            // texto normalizado para buscar
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Índice de búsqueda: el mapa 4Shine (fijo) más el portafolio de la empresa activa. */
function buildIndex(v: TenantView): Entry[] {
  const e: Entry[] = [];
  for (const p of PRACTICES) {
    e.push({
      id: p.code, group: "Prácticas del mapa",
      title: `${p.code} · ${p.f1.slice(0, 90)}`, sub: p.dim,
      href: `/panel/diagnostico/dimension/${p.dim}`,
      haystack: norm(`${p.code} ${p.f1} ${p.ev}`),
    });
  }
  for (const d of DIMS) {
    e.push({
      id: d.code, group: "Dimensiones",
      title: `${d.code} · ${d.name}`, sub: d.cap,
      href: `/panel/diagnostico/dimension/${d.code}`,
      haystack: norm(`${d.code} ${d.name} ${d.defn}`),
    });
  }
  for (const f of FRAMEWORKS) {
    e.push({
      id: f.id, group: "Frameworks",
      title: `${f.id} · ${f.name}`, sub: f.cap,
      href: `/panel/metodologia#${f.id}`,
      haystack: norm(`${f.id} ${f.name} ${f.promise}`),
    });
  }
  for (const k of v.kpis) {
    e.push({
      id: k.code, group: "Indicadores",
      title: `${k.code} · ${k.name}`, sub: `${k.unit} · ${k.frequency}`,
      href: "/panel/kpi",
      haystack: norm(`${k.code} ${k.name} ${k.definition}`),
    });
  }
  for (const i of v.initiatives) {
    e.push({
      id: i.id, group: "Iniciativas",
      title: `${i.id.toUpperCase()} · ${i.name}`, sub: i.subsistema,
      href: `/panel/iniciativas/${i.id}`,
      haystack: norm(`${i.id} ${i.name} ${i.objetivo}`),
    });
  }
  for (const t of v.tasks) {
    e.push({
      id: t.id, group: "Tareas",
      title: `${t.id} · ${t.title}`, sub: `vence ${t.due}`,
      href: `/panel/proyectos/${t.iniId}`,
      haystack: norm(`${t.id} ${t.title} ${t.desc}`),
    });
  }
  for (const p of v.catalog.people) {
    e.push({
      id: p.id, group: "Personas",
      title: p.name, sub: p.cargo,
      href: "/panel/proyectos",
      haystack: norm(`${p.name} ${p.cargo} ${p.dependencia}`),
    });
  }
  const MODULES: [string, string, string][] = [
    ["Panel", "estado general", "/panel"],
    ["Diagnóstico (M1)", "4Shine-OD: capacidades, dimensiones y prácticas", "/panel/diagnostico"],
    ["Test de capacidad empresarial", "etapa, perfil y prioridad", "/panel/diagnostico/test"],
    ["Brechas priorizadas", "cuello de botella y nivel de acompañamiento", "/panel/diagnostico/brechas"],
    ["Benchmark (M2)", "posición sectorial y territorio", "/panel/benchmark"],
    ["Estrategia (M3)", "cuadro de mando y OKR", "/panel/estrategia"],
    ["Indicadores (M4)", "KPI con serie y semáforo", "/panel/kpi"],
    ["Ruta (M5)", "roadmap y priorización", "/panel/ruta"],
    ["Iniciativas (M6)", "seguimiento profundo", "/panel/iniciativas"],
    ["Proyectos (GP)", "plan de trabajo", "/panel/proyectos"],
    ["Inteligencia (M7)", "BI por sector", "/panel/bi"],
    ["Informe ejecutivo", "pieza imprimible para la junta", "/panel/informe/ejecutivo"],
    ["Metodología", "el sistema 4Shine Empresas", "/panel/metodologia"],
  ];
  for (const [title, sub, href] of MODULES) {
    e.push({ id: href, group: "Módulos", title, sub, href, haystack: norm(`${title} ${sub}`) });
  }
  return e;
}

export function CommandPalette() {
  const base = useBase();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const v = useCatalog();
  const index = useMemo(() => buildIndex(v), [v]);

  // ⌘K / Ctrl+K abre; Esc cierra
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQ("");
        setSel(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);

  const results = useMemo(() => {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      return index.filter((e) => e.group === "Módulos").slice(0, 10);
    }
    return index
      .filter((e) => terms.every((t) => e.haystack.includes(t)))
      .slice(0, 14);
  }, [q, index]);

  const go = useCallback((e: Entry) => {
    setOpen(false);
    router.push(base + e.href);
  }, [router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-navy-deep/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div className="absolute left-1/2 top-[12vh] w-[min(620px,92vw)] -translate-x-1/2 overflow-hidden rounded-2xl bg-surface"
        style={{ boxShadow: "var(--e3)" }}>
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search size={16} className="shrink-0 text-muted" />
          <input ref={inputRef} type="text" value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              if (e.key === "Enter" && results[sel]) go(results[sel]);
            }}
            placeholder="Buscar variables, KPI, iniciativas, tareas, programas, personas…"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-faint" />
          <kbd className="num rounded bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold text-faint">ESC</kbd>
        </div>
        <div className="max-h-[54vh] overflow-y-auto py-1.5">
          {results.length === 0 && (
            <p className="px-4 py-6 text-center text-[12.5px] italic text-faint">
              Sin resultados para «{q}».
            </p>
          )}
          {results.map((e, i) => {
            const showGroup = i === 0 || results[i - 1].group !== e.group;
            return (
              <div key={e.group + e.id}>
                {showGroup && <div className="label px-4 pb-1 pt-2 !text-[8px]">{e.group}</div>}
                <button onClick={() => go(e)} onMouseEnter={() => setSel(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left ${
                    sel === i ? "bg-cyan-wash" : ""}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{e.title}</span>
                    <span className="block truncate text-[10.5px] text-faint">{e.sub}</span>
                  </span>
                  {sel === i && <CornerDownLeft size={13} className="shrink-0 text-cyan-deep" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="border-t border-line px-4 py-2 text-[9.5px] text-faint">
          ↑↓ navegar · Enter abrir · las variables, iniciativas, tareas y programas abren su ficha
        </div>
      </div>
    </div>
  );
}

/** Botón de la topbar que abre la paleta (dispara el atajo). */
export function SearchButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
      className="hidden items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-[11.5px] text-muted transition-colors hover:text-ink sm:flex"
      title="Buscar (⌘K)">
      <Search size={13} /> Buscar…
      <kbd className="num rounded bg-surface px-1.5 py-0.5 text-[9px] font-bold text-faint shadow-sm">⌘K</kbd>
    </button>
  );
}
